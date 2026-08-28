import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Обработчики service worker проверяем как чистые функции: сам worker живёт
 * вне окна и в jsdom не запускается.
 */
type Listener = (event: unknown) => void;

const ORIGIN = 'https://chat.example';

/** Ответ-картинка: worker смотрит только на ok, Content-Length и clone(). */
function imageResponse(options: { ok?: boolean; kilobytes?: number; tag?: string } = {}) {
  const { ok = true, kilobytes = 60, tag = 'body' } = options;
  const response = {
    ok,
    tag,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(kilobytes * 1024) : null) },
    clone: () => imageResponse(options),
  };

  return response;
}

/**
 * Cache Storage настолько, насколько её использует worker. Map хранит порядок
 * вставки и не двигает существующий ключ при перезаписи — ровно как настоящее
 * хранилище, поэтому LRU-подрезку на ней видно честно.
 */
class FakeCache {
  readonly entries = new Map<string, unknown>();
  /** Параметры последнего поиска: worker обязан просить `ignoreVary`. */
  matchOptions: unknown = undefined;

  async match(request: { url: string }, options?: unknown) {
    this.matchOptions = options;

    return this.entries.get(request.url);
  }

  async put(request: { url: string }, response: unknown) {
    this.entries.set(request.url, response);
  }

  async delete(request: { url: string }) {
    return this.entries.delete(request.url);
  }

  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }

  async addAll() {}
}

function loadWorker(pushManager?: Record<string, ReturnType<typeof vi.fn>>): {
  listeners: Map<string, Listener>;
  registration: Record<string, unknown>;
  clients: Record<string, ReturnType<typeof vi.fn>>;
  caches: Record<string, ReturnType<typeof vi.fn>>;
  stores: Map<string, FakeCache>;
} {
  const listeners = new Map<string, Listener>();
  const registration = { showNotification: vi.fn(), pushManager };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn(), claim: vi.fn() };
  const stores = new Map<string, FakeCache>();

  const caches = {
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new FakeCache());

      return stores.get(name)!;
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
    match: vi.fn(),
  };

  const scope = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration,
    clients,
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    cookieStore: { get: vi.fn().mockResolvedValue({ value: 'csrf-token' }) },
    caches,
  };

  const source = readWorkerSource();
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', source)(scope, scope.caches);

  return { listeners, registration, clients, caches, stores };
}

/** Прогон обработчика fetch: возвращает отданный ответ и ждёт фоновых записей. */
async function handleFetch(
  listeners: Map<string, Listener>,
  request: { url: string; method?: string; mode?: string },
): Promise<{ responded: boolean; response: unknown }> {
  const waits: Promise<unknown>[] = [];
  let responded: Promise<unknown> | null = null;

  listeners.get('fetch')?.({
    request: { method: 'GET', mode: 'cors', ...request },
    respondWith: (promise: Promise<unknown>) => {
      responded = promise;
    },
    waitUntil: (promise: Promise<unknown>) => waits.push(promise),
  });

  const response = responded === null ? null : await responded;
  await Promise.all(waits);

  return { responded: responded !== null, response };
}

function readWorkerSource(): string {
  // Читаем ровно тот файл, который уедет в сборку.
  return readFileSync(resolve(__dirname, '../public/sw.js'), 'utf8');
}

describe('service worker', () => {
  it('показывает уведомление из полезной нагрузки push', async () => {
    const { listeners, registration } = loadWorker();
    const waits: Promise<unknown>[] = [];

    listeners.get('push')?.({
      data: { json: () => ({ title: 'Семья', body: 'Алексей: пирог', url: '/rooms/r1', tag: 'message:r1' }) },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(registration.showNotification).toHaveBeenCalledWith(
      'Семья',
      expect.objectContaining({ body: 'Алексей: пирог', tag: 'message:r1', data: { url: '/rooms/r1' } }),
    );
  });

  it('переиспользует открытое окно вместо второго', async () => {
    const { listeners, clients } = loadWorker();
    const focus = vi.fn();
    const navigate = vi.fn();
    clients.matchAll.mockResolvedValue([{ focus, navigate }]);

    const waits: Promise<unknown>[] = [];
    listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { url: '/rooms/r1' } },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(navigate).toHaveBeenCalledWith('/rooms/r1');
    expect(focus).toHaveBeenCalled();
    expect(clients.openWindow).not.toHaveBeenCalled();
  });

  it('открывает новое окно, если приложение закрыто', async () => {
    const { listeners, clients } = loadWorker();
    clients.matchAll.mockResolvedValue([]);

    const waits: Promise<unknown>[] = [];
    listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { url: '/rooms/r2' } },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(clients.openWindow).toHaveBeenCalledWith('/rooms/r2');
  });

  it('не вмешивается в запросы к API', () => {
    const { listeners } = loadWorker();
    const respondWith = vi.fn();

    listeners.get('fetch')?.({ request: { mode: 'cors', url: '/api/v1/rooms' }, respondWith });

    expect(respondWith).not.toHaveBeenCalled();
  });
});

describe('service worker: кеш изображений', () => {
  const THUMB = `${ORIGIN}/api/v1/attachments/a1/thumb`;
  const IMAGES = 'chat-images-v1';

  afterEach(() => vi.unstubAllGlobals());

  /** Сеть, отдающая картинку; счётчик показывает, ходили ли за ней. */
  function stubNetwork(response: unknown = imageResponse()) {
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
  }

  it('берёт показанную картинку из кеша, не обращаясь к сети', async () => {
    const fetchMock = stubNetwork();
    const { listeners, stores } = loadWorker();

    const first = await handleFetch(listeners, { url: THUMB });
    expect(first.responded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stores.get(IMAGES)!.entries.has(THUMB)).toBe(true);

    const second = await handleFetch(listeners, { url: THUMB });

    // Повторный показ идёт из хранилища: сеть больше не тревожим.
    expect(second.responded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Запрос за картинкой несёт заголовок авторизации (ADR-012), а ответ —
    // Vary. Без ignoreVary совпадение по заголовкам разрушало бы кеш.
    expect(stores.get(IMAGES)!.matchOptions).toEqual({ ignoreVary: true });
  });

  it('кеширует картинки профиля и комнаты, но не оригинал вложения', async () => {
    stubNetwork();
    const { listeners, stores } = loadWorker();

    for (const path of ['/api/v1/avatars/i1/thumb', '/api/v1/avatars/i1', '/api/v1/room-photos/p1']) {
      await handleFetch(listeners, { url: `${ORIGIN}${path}` });
    }

    // Оригинал вложения с телефона — это десятки МБ, ему в кеше не место.
    const original = await handleFetch(listeners, { url: `${ORIGIN}/api/v1/attachments/a1` });

    expect([...stores.get(IMAGES)!.entries.keys()]).toEqual([
      `${ORIGIN}/api/v1/avatars/i1/thumb`,
      `${ORIGIN}/api/v1/avatars/i1`,
      `${ORIGIN}/api/v1/room-photos/p1`,
    ]);
    expect(original.responded).toBe(false);
  });

  it('не трогает данные API, навигацию и мутации', async () => {
    stubNetwork();
    const { listeners, stores } = loadWorker();

    const api = await handleFetch(listeners, { url: `${ORIGIN}/api/v1/rooms` });
    const upload = await handleFetch(listeners, { url: THUMB, method: 'POST' });
    const foreign = await handleFetch(listeners, { url: 'https://cdn.example/avatars/x/thumb' });

    expect(api.responded).toBe(false);
    expect(upload.responded).toBe(false);
    expect(foreign.responded).toBe(false);
    expect(stores.has(IMAGES)).toBe(false);

    // Навигация по-прежнему обслуживается экраном «нет связи», а не кешем.
    const navigation = await handleFetch(listeners, { url: `${ORIGIN}/rooms/r1`, mode: 'navigate' });
    expect(navigation.responded).toBe(true);
  });

  it('вытесняет самые давние записи сверх предела, а попадание уносит запись в конец', async () => {
    stubNetwork();
    const { listeners, stores } = loadWorker();

    // Заполняем кеш до предела: первым лежит самый давний адрес.
    const cache = new FakeCache();
    stores.set(IMAGES, cache);
    for (let index = 0; index < 400; index++) {
      cache.entries.set(`${ORIGIN}/api/v1/attachments/old-${index}/thumb`, imageResponse());
    }

    // Обращение к давней записи переписывает её — она уходит в конец очереди.
    await handleFetch(listeners, { url: `${ORIGIN}/api/v1/attachments/old-0/thumb` });
    expect([...cache.entries.keys()].at(-1)).toBe(`${ORIGIN}/api/v1/attachments/old-0/thumb`);

    // Новая запись переполняет предел: уходит следующая по давности.
    await handleFetch(listeners, { url: THUMB });

    expect(cache.entries.size).toBe(400);
    expect(cache.entries.has(`${ORIGIN}/api/v1/attachments/old-1/thumb`)).toBe(false);
    expect(cache.entries.has(`${ORIGIN}/api/v1/attachments/old-0/thumb`)).toBe(true);
    expect(cache.entries.has(THUMB)).toBe(true);
  });

  it('не сохраняет ни ошибку, ни слишком крупный ответ', async () => {
    // 404 неготовой миниатюры не должен осесть на устройстве навсегда.
    const missing = stubNetwork(imageResponse({ ok: false }));
    const { listeners, stores } = loadWorker();

    await handleFetch(listeners, { url: THUMB });
    expect(stores.get(IMAGES)!.entries.size).toBe(0);

    // Следующий запрос снова идёт к серверу.
    await handleFetch(listeners, { url: THUMB });
    expect(missing).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
    stubNetwork(imageResponse({ kilobytes: 4096 }));
    const heavy = loadWorker();
    await handleFetch(heavy.listeners, { url: THUMB });

    expect(heavy.stores.get(IMAGES)!.entries.size).toBe(0);
  });

  it('показывает изображение, даже когда хранилище отказало', async () => {
    const fetchMock = stubNetwork(imageResponse({ tag: 'from-network' }));
    const { listeners, caches } = loadWorker();
    caches.open.mockImplementation(async () => ({
      match: async () => undefined,
      put: async () => {
        throw new Error('QuotaExceededError');
      },
      delete: async () => false,
      keys: async () => [],
    }));

    const { response } = await handleFetch(listeners, { url: THUMB });

    expect((response as { tag: string }).tag).toBe('from-network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('чистит кеш изображений по команде приложения', async () => {
    stubNetwork();
    const { listeners, caches, stores } = loadWorker();

    await handleFetch(listeners, { url: THUMB });
    expect(stores.get(IMAGES)!.entries.size).toBe(1);

    const waits: Promise<unknown>[] = [];
    listeners.get('message')?.({
      data: 'clear-images',
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(caches.delete).toHaveBeenCalledWith(IMAGES);
    expect(stores.has(IMAGES)).toBe(false);
  });

  it('удаляет прежние кеши при активации и оставляет оболочку и изображения', async () => {
    const { listeners, caches, stores } = loadWorker();
    stores.set('chat-shell-v1', new FakeCache());
    stores.set('chat-shell-v2', new FakeCache());
    stores.set('chat-images-v1', new FakeCache());

    const waits: Promise<unknown>[] = [];
    listeners.get('activate')?.({ waitUntil: (promise: Promise<unknown>) => waits.push(promise) });
    await Promise.all(waits);

    expect(caches.delete).toHaveBeenCalledWith('chat-shell-v1');
    expect(caches.delete).not.toHaveBeenCalledWith('chat-shell-v2');
    expect(caches.delete).not.toHaveBeenCalledWith('chat-images-v1');
  });
});

describe('service worker: перевыпуск подписки', () => {
  /** Подписка, которую браузер выдаёт взамен отозванной. */
  const fresh = {
    toJSON: () => ({ endpoint: 'https://push.example.com/fresh', keys: { p256dh: 'p', auth: 'a' } }),
  };

  function fakeFetch() {
    return vi.fn(async (url: string) => {
      if (String(url).endsWith('/config.json')) {
        return {
          ok: true,
          json: async () => ({ apiBaseUrl: '/api/v1', push: { publicKey: 'BQ' } }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });
  }

  it('перевыпускает подписку, но не отправляет её сам', async () => {
    const fetchMock = fakeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const subscribe = vi.fn().mockResolvedValue(fresh);
    const { listeners } = loadWorker({ subscribe });

    const waits: Promise<unknown>[] = [];
    listeners.get('pushsubscriptionchange')?.({
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));

    // Токен доступа лежит в localStorage страницы: worker им не располагает и
    // второго хранилища учётных данных не заводит (ADR-012). Подписку донесёт
    // приложение при следующем запуске — POST /push-subscriptions идемпотентен.
    const posts = fetchMock.mock.calls.filter(
      ([, options]) => (options as Record<string, unknown> | undefined)?.method === 'POST',
    );
    expect(posts).toHaveLength(0);
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/config.json'))).toBe(true);

    vi.unstubAllGlobals();
  });

  it('молчит, когда push на сервере не настроен', async () => {
    // Без ключа подписываться не на что — и запроса быть не должно.
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ push: { publicKey: '' } }) }));
    vi.stubGlobal('fetch', fetchMock);
    const subscribe = vi.fn();
    const { listeners } = loadWorker({ subscribe });

    const waits: Promise<unknown>[] = [];
    listeners.get('pushsubscriptionchange')?.({
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(subscribe).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
