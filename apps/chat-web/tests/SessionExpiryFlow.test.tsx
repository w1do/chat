import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Настоящий Echo в jsdom не нужен: важно, что сокет замолкает, когда вход
// признан недействительным.
const suspendRealtime = vi.fn();

vi.mock('../src/app/echo', () => ({
  suspendRealtime,
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

/** Установка, которая по команде теста отзывает токен. */
const server = {
  calls: [] as string[],
  alive: true,
  reset() {
    this.calls = [];
    this.alive = true;
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
        push: { publicKey: '' },
        password: { minLength: '1' },
        branding: { appName: 'Чат' },
      });
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
  token: typeof import('../src/app/token');
  queryClient: QueryClient;
}

/** Загрузка страницы: модульное состояние входа живёт ровно столько же. */
async function openApp(): Promise<App> {
  // Перезагрузка страницы: прежний документ исчезает вместе с его состоянием.
  cleanup();
  vi.resetModules();
  suspendRealtime.mockClear();
  assign.mockClear();
  reload.mockClear();
  server.reset();
  deviceCaches.reset();
  localStorage.clear();

  vi.stubGlobal('fetch', server.handler);
  vi.stubGlobal('caches', deviceCaches);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { origin: 'http://localhost:3000', pathname: '/', assign, reload },
  });

  const config = await import('../src/app/runtime-config');
  await config.loadRuntimeConfig();

  // Вход уже состоялся на прошлой странице: токен лежит в хранилище.
  const token = await import('../src/app/token');
  token.storeAuthToken('secret-token');

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

  return { session, token, queryClient };
}

/** Токен отзывают посреди работы: следующий запрос возвращает 401. */
async function revokeDuringWork(app: App): Promise<void> {
  server.expire();
  await act(async () => {
    await app.queryClient.invalidateQueries({ queryKey: ['rooms'] });
  });
}

describe('токен отозван посреди работы', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('уводит на форму входа один раз и перестаёт ходить в сеть', async () => {
    const app = await openApp();

    await revokeDuringWork(app);

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
    expect(assign).toHaveBeenCalledTimes(1);
    expect(suspendRealtime).toHaveBeenCalled();
    expect(app.token.authToken()).toBeNull();

    // Повторов нет: ни автоматических, ни по новому обращению к данным.
    const requests = server.count('/rooms');
    await act(async () => {
      await app.queryClient.invalidateQueries({ queryKey: ['rooms'] });
    });
    expect(server.count('/rooms')).toBe(requests);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });

  it('не пытается восстановить вход сам', async () => {
    const app = await openApp();

    await revokeDuringWork(app);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));

    // Ни CSRF-handshake, ни повторной проверки `/me`: восстанавливать нечего.
    expect(server.count('/sanctum/csrf-cookie')).toBe(0);
    expect(server.count('/api/v1/me')).toBe(1);
  });

  it('очищает кеш изображений при переходе на форму входа', async () => {
    const app = await openApp();

    await revokeDuringWork(app);

    await waitFor(() => expect(deviceCaches.delete).toHaveBeenCalledWith('chat-images-v1'));
    expect(deviceCaches.names.has('chat-images-v1')).toBe(false);
    // Оболочка остаётся — экран «нет связи» после выхода никуда не девается.
    expect(deviceCaches.names.has('chat-shell-v2')).toBe(true);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });

  it('после повторного входа приложение работает как обычно', async () => {
    const app = await openApp();
    await revokeDuringWork(app);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));

    // Переход на /login перезагружает страницу — состояние входа начинается
    // заново, как и после любого входа.
    const next = await openApp();

    expect(next.session.sessionStatus()).toBe('authorized');
    expect(screen.getAllByText('Дом').length).toBeGreaterThan(0);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });
});
