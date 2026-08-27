import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Настоящий Echo в jsdom не нужен: важно, что сокет замолкает на время
// инцидента и оживает после восстановления.
const suspendRealtime = vi.fn();
const resumeRealtime = vi.fn();

vi.mock('../src/app/echo', () => ({
  suspendRealtime,
  resumeRealtime,
  realtimeAdapter: () => null,
  createRealtimeAdapter: () => null,
}));

const assign = vi.fn();
const reload = vi.fn();

/**
 * Кеши окна. Service worker'а в jsdom нет, поэтому приложение чистит кеш
 * изображений само — это вторая ветка `clearImageCache`.
 */
const deviceCaches = {
  names: new Set<string>(),
  delete: vi.fn(async (name: string) => deviceCaches.names.delete(name)),
  reset() {
    this.names = new Set(['chat-images-v1', 'chat-shell-v2']);
    this.delete.mockClear();
  },
};

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const EXPIRED = { code: 'unauthenticated', message: 'Unauthenticated.', details: {}, trace_id: null };

let silentRecovery = false;

/** Установка с живой сессией, которая по команде теста «истекает». */
const server = {
  calls: [] as string[],
  alive: true,
  /** Обновление CSRF-cookie оживляет сессию — так выглядит успешное тихое
   *  восстановление после долгого простоя вкладки. */
  recoverOnCsrf: false,
  reset() {
    this.calls = [];
    this.alive = true;
    this.recoverOnCsrf = false;
  },
  expire() {
    this.alive = false;
  },
  count(fragment: string): number {
    return this.calls.filter((url) => url.includes(fragment)).length;
  },
  handler: vi.fn(async (input: unknown) => {
    const url = String(input);
    server.calls.push(url);

    if (url.includes('/config.json')) {
      return reply(200, {
        apiBaseUrl: '/api/v1',
        reverb: { host: '', port: '', scheme: '', appKey: '' },
        ai: { enabled: 'false' },
        auth: { silentRecovery: silentRecovery ? 'true' : 'false' },
        push: { publicKey: '' },
        password: { minLength: '1' },
        branding: { appName: 'Чат' },
      });
    }
    if (url.includes('/sanctum/csrf-cookie')) {
      if (server.recoverOnCsrf) server.alive = true;

      return reply(204, null);
    }
    if (url.includes('/auth/logout')) return reply(204, null);
    if (!server.alive) return reply(401, EXPIRED);
    if (url.includes('/api/v1/me')) return reply(200, { data: { id: 'u1', login: 'ann', name: 'Аня' } });
    if (url.includes('/rooms')) return reply(200, { data: [{ id: 'r1', name: 'Дом' }] });

    return reply(404, { code: 'not_found', message: 'not found', details: {}, trace_id: null });
  }),
};

/**
 * Экран приложения: читает список комнат тем же клиентом, что и весь чат.
 * Собирается на месте — пакеты приложения загружаются заново для каждого
 * случая, и хук должен приехать из той же загрузки, что и провайдер.
 */
function makeFeed(useApiClient: typeof import('@vendor/identity').useApiClient) {
  return function Feed() {
    const client = useApiClient();
    const rooms = useQuery({
      queryKey: ['rooms'],
      queryFn: async () => (await client.get('/rooms')) as { data: Array<{ id: string; name: string }> },
    });

    return (
      <main data-testid="feed">
        {rooms.data ? rooms.data.data.map((room) => <p key={room.id}>{room.name}</p>) : '…'}
        <label>
          Сообщение
          <input type="text" />
        </label>
      </main>
    );
  };
}

interface App {
  session: typeof import('../src/app/session');
  queryClient: QueryClient;
}

/** Загрузка страницы: модульное состояние сессии живёт ровно столько же. */
async function openApp(options: { recovery?: boolean } = {}): Promise<App> {
  // Перезагрузка страницы: прежний документ исчезает вместе с его состоянием.
  cleanup();
  vi.resetModules();
  suspendRealtime.mockClear();
  resumeRealtime.mockClear();
  assign.mockClear();
  reload.mockClear();
  server.reset();
  deviceCaches.reset();
  silentRecovery = options.recovery ?? false;

  vi.stubGlobal('fetch', server.handler);
  vi.stubGlobal('caches', deviceCaches);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { origin: 'http://localhost:3000', pathname: '/', assign, reload },
  });

  const config = await import('../src/app/runtime-config');
  await config.loadRuntimeConfig();

  const session = await import('../src/app/session');
  const { apiClient } = await import('../src/app/api');
  const { AuthProvider } = await import('../src/app/auth');
  const { createQueryClient } = await import('../src/app/query-client');
  const { IdentityProvider, useApiClient } = await import('@vendor/identity');
  const queryClient = createQueryClient();
  const Feed = makeFeed(useApiClient);

  render(
    <QueryClientProvider client={queryClient}>
      <IdentityProvider client={apiClient()}>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </IdentityProvider>
    </QueryClientProvider>,
  );

  // Вход состоялся: `/me` ответил, комната показана.
  await screen.findByText('Дом');

  return { session, queryClient };
}

const expiredDialog = () => screen.queryByRole('dialog', { name: 'Сессия истекла' });

/** Сессия истекает посреди работы: следующий запрос возвращает 401. */
async function expireDuringWork(app: App): Promise<void> {
  server.expire();
  await act(async () => {
    await app.queryClient.invalidateQueries({ queryKey: ['rooms'] });
  });
}

describe('сессия истекла посреди работы', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('показывает объяснение вместо мигания и перестаёт ходить в сеть', async () => {
    const app = await openApp();
    const feed = screen.getByTestId('feed');

    await expireDuringWork(app);

    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());
    // Лента не перерисовывалась заново: тот же узел, тот же текст — мигания нет.
    expect(screen.getByTestId('feed')).toBe(feed);
    expect(screen.getByText('Дом')).toBeInTheDocument();
    expect(suspendRealtime).toHaveBeenCalled();

    // Повторов нет: ни автоматических, ни по новому обращению к данным.
    const requests = server.count('/rooms');
    await act(async () => {
      await app.queryClient.invalidateQueries({ queryKey: ['rooms'] });
    });
    expect(server.count('/rooms')).toBe(requests);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });

  it('«Войти снова» завершает сессию и уводит к форме входа', async () => {
    const app = await openApp();
    await expireDuringWork(app);
    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Войти снова' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
    expect(server.count('/auth/logout')).toBe(1);

    // После выхода кеш изображений пуст: следующему человеку за этим
    // устройством чужие фотографии не достаются (spec platform/image-cache).
    expect(deviceCaches.names.has('chat-images-v1')).toBe(false);
    // Оболочка остаётся — экран «нет связи» после выхода никуда не девается.
    expect(deviceCaches.names.has('chat-shell-v2')).toBe(true);
  });

  it('очищает кеш изображений уже при переходе в «сессия истекла»', async () => {
    const app = await openApp();

    await expireDuringWork(app);

    await waitFor(() => expect(deviceCaches.delete).toHaveBeenCalledWith('chat-images-v1'));
    expect(deviceCaches.names.has('chat-images-v1')).toBe(false);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });

  it('после повторного входа приложение работает как обычно', async () => {
    const app = await openApp();
    await expireDuringWork(app);
    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());

    // Переход на /login перезагружает страницу — состояние сессии начинается
    // заново, как и после любого входа.
    await openApp();

    expect(expiredDialog()).toBeNull();
    expect(screen.getAllByText('Дом').length).toBeGreaterThan(0);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });
});

describe('набранный текст', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('переживает истёкшую сессию: чат перекрыт, а не размонтирован', async () => {
    const app = await openApp();
    const draft = screen.getByLabelText('Сообщение');
    await userEvent.type(draft, 'вечером зайду');

    await expireDuringWork(app);
    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());

    // Написанное не пропало — за экраном тот же композер с тем же текстом.
    expect(screen.getByLabelText('Сообщение')).toHaveValue('вечером зайду');
  });
});

describe('тихое восстановление посреди работы', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('возвращает данные и подписки, не показав экрана', async () => {
    const app = await openApp({ recovery: true });
    await userEvent.type(screen.getByLabelText('Сообщение'), 'уже иду');

    // Сессия истекла, но обновление CSRF-токена её оживило.
    server.recoverOnCsrf = true;
    server.expire();
    await act(async () => {
      await app.queryClient.invalidateQueries({ queryKey: ['rooms'] });
    });

    await waitFor(() => expect(app.session.sessionStatus()).toBe('authorized'));
    expect(expiredDialog()).toBeNull();
    // Сокет поднят заново, данные перечитаны.
    await waitFor(() => expect(resumeRealtime).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Дом')).toBeInTheDocument());
    // Набранное во время обрыва осталось на месте.
    expect(screen.getByLabelText('Сообщение')).toHaveValue('уже иду');
  });
});
