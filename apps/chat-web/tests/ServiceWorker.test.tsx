import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Обработчики service worker проверяем как чистые функции: сам worker живёт
 * вне окна и в jsdom не запускается.
 */
type Listener = (event: unknown) => void;

function loadWorker(pushManager?: Record<string, ReturnType<typeof vi.fn>>): {
  listeners: Map<string, Listener>;
  registration: Record<string, unknown>;
  clients: Record<string, ReturnType<typeof vi.fn>>;
} {
  const listeners = new Map<string, Listener>();
  const registration = { showNotification: vi.fn(), pushManager };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn(), claim: vi.fn() };

  const scope = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration,
    clients,
    skipWaiting: vi.fn(),
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    cookieStore: { get: vi.fn().mockResolvedValue({ value: 'csrf-token' }) },
    caches: { open: vi.fn().mockResolvedValue({ addAll: vi.fn() }), keys: vi.fn().mockResolvedValue([]), match: vi.fn() },
  };

  const source = readWorkerSource();
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', source)(scope, scope.caches);

  return { listeners, registration, clients };
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

  it('подписывается заново и отдаёт новую подписку серверу', async () => {
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

    const [url, options] = fetchMock.mock.calls.at(-1) as [string, Record<string, unknown>];
    expect(url).toBe('/api/v1/push-subscriptions');
    expect(options.method).toBe('POST');
    // Сессия ходит cookie'ами, значит нужен CSRF-заголовок.
    expect((options.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('csrf-token');
    expect(JSON.parse(String(options.body)).endpoint).toBe('https://push.example.com/fresh');

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
