import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Реальный Echo тянет pusher-js и открывает сокет: в тесте нам важно лишь то,
// что приложение вовремя его гасит.
const suspendRealtime = vi.fn();

vi.mock('../src/app/echo', () => ({
  suspendRealtime,
  realtimeAdapter: () => null,
  createRealtimeAdapter: () => null,
}));

// Провайдер узнаёт о состоявшемся входе от useAuth; сам запрос `/me` в этом
// файле проверяется напрямую через ApiClient.
let currentUser: { id: string } | null = { id: 'u1' };

vi.mock('@vendor/identity', async () => {
  const actual = await vi.importActual<typeof import('@vendor/identity')>('@vendor/identity');

  return { ...actual, useAuth: () => ({ user: currentUser }) };
});

const assign = vi.fn();
const reload = vi.fn();

/** Ответ в формате, который читает ApiClient. */
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

/** Маленький поддельный сервер: каждый тест задаёт ответы `/me` и `/rooms`. */
const server = {
  calls: [] as string[],
  me: 200,
  rooms: 200,
  reset() {
    this.calls = [];
    this.me = 200;
    this.rooms = 200;
  },
  count(fragment: string): number {
    return this.calls.filter((url) => url.includes(fragment)).length;
  },
  header(fragment: string, name: string): string | undefined {
    const call = server.handler.mock.calls.find(([url]) => String(url).includes(fragment));
    const headers = (call?.[1] as { headers?: Record<string, string> } | undefined)?.headers;

    return headers?.[name];
  },
  handler: vi.fn(async (input: unknown, _init?: unknown) => {
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
    if (url.includes('/api/v1/me')) {
      return server.me === 200 ? reply(200, { data: { id: 'u1' } }) : reply(401, EXPIRED);
    }
    if (url.includes('/rooms')) {
      return server.rooms === 200 ? reply(200, { data: [] }) : reply(401, EXPIRED);
    }

    return reply(404, { code: 'not_found', message: 'not found', details: {}, trace_id: null });
  }),
};

interface Harness {
  session: typeof import('../src/app/session');
  token: typeof import('../src/app/token');
  client: import('@vendor/api-client').ApiClient;
  AuthProvider: typeof import('../src/app/auth').AuthProvider;
  queryClient: QueryClient;
  Unauthenticated: typeof import('@vendor/api-client').UnauthenticatedError;
}

/**
 * Состояние входа живёт в модуле на время жизни страницы, поэтому каждый
 * случай поднимает приложение заново.
 */
async function boot(options: { user?: { id: string } | null; token?: string | null } = {}): Promise<Harness> {
  vi.resetModules();
  suspendRealtime.mockClear();
  assign.mockClear();
  reload.mockClear();
  server.reset();
  server.handler.mockClear();
  localStorage.clear();
  currentUser = options.user === undefined ? { id: 'u1' } : options.user;

  vi.stubGlobal('fetch', server.handler);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { origin: 'http://localhost:3000', pathname: '/', assign, reload },
  });

  const config = await import('../src/app/runtime-config');
  await config.loadRuntimeConfig();

  const token = await import('../src/app/token');
  if (options.token !== null) token.storeAuthToken(options.token ?? 'secret-token');

  const session = await import('../src/app/session');
  const { apiClient } = await import('../src/app/api');
  const { AuthProvider } = await import('../src/app/auth');
  const { createQueryClient } = await import('../src/app/query-client');
  const { UnauthenticatedError } = await import('@vendor/api-client');

  return {
    session,
    token,
    client: apiClient(),
    AuthProvider,
    queryClient: createQueryClient(),
    Unauthenticated: UnauthenticatedError,
  };
}

function renderApp({ AuthProvider, queryClient }: Harness) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <main>Лента чата</main>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

/** 401 меняет состояние провайдера, поэтому ответа ждём внутри act. */
async function expect401(app: Harness, request: Promise<unknown>): Promise<void> {
  await act(async () => {
    await expect(request).rejects.toBeInstanceOf(app.Unauthenticated);
  });
}

describe('запрос вошедшего человека', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('несёт токен заголовком и не несёт cookie и CSRF', async () => {
    const app = await boot({ token: 'secret-token' });

    await app.client.get('/rooms');

    expect(server.header('/rooms', 'Authorization')).toBe('Bearer secret-token');
    const init = server.handler.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(init.credentials).toBeUndefined();
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBeUndefined();
    // Токен уходит только заголовком: в адресе его нет (spec).
    expect(server.calls.at(-1)).not.toContain('secret-token');
  });

  it('без токена не уходит в сеть вовсе', async () => {
    const app = await boot({ token: null });
    const before = server.count('/rooms');

    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);

    expect(server.count('/rooms')).toBe(before);
  });

  it('публичные экраны работают и без токена', async () => {
    const app = await boot({ token: null });

    // Вход и приглашение открывают до входа: их запросы не подавляются.
    await app.client.post('/auth/logout');

    expect(server.count('/auth/logout')).toBe(1);
  });
});

describe('первый 401', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('до входа не считается недействительным входом', async () => {
    const app = await boot({ user: null });

    server.me = 401;
    await expect(app.client.get('/me')).rejects.toBeInstanceOf(app.Unauthenticated);

    // Человек просто не представился: этим занимаются guard и страница входа.
    expect(app.session.sessionStatus()).toBe('authorized');
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('после входа переводит приложение в «вход недействителен»', async () => {
    const app = await boot();
    app.session.markSessionEstablished();

    server.rooms = 401;
    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);

    expect(app.session.sessionStatus()).toBe('unauthorized');
  });

  it('несколько одновременных 401 дают ровно один переход', async () => {
    const app = await boot();
    app.session.markSessionEstablished();

    const changes = vi.fn();
    app.session.subscribeSession(changes);

    server.rooms = 401;
    await act(async () => {
      await Promise.all([
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
      ]);
    });

    expect(changes).toHaveBeenCalledTimes(1);
    expect(app.session.sessionStatus()).toBe('unauthorized');
  });
});

describe('пока вход недействителен', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('защищённые запросы не уходят в сеть', async () => {
    const app = await boot();
    app.session.markSessionEstablished();
    server.rooms = 401;
    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);

    const before = server.count('/rooms');
    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);
    await expect(app.client.post('/rooms', { body: { name: 'Дом' } })).rejects.toBeInstanceOf(app.Unauthenticated);

    // Ни повтора запроса, ни CSRF-handshake перед мутацией.
    expect(server.count('/rooms')).toBe(before);
    expect(server.count('/sanctum/csrf-cookie')).toBe(0);
  });

  it('выход по-прежнему проходит: им пользуется сам уход на форму входа', async () => {
    const app = await boot();
    app.session.markSessionEstablished();
    server.rooms = 401;
    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);

    await app.client.post('/auth/logout');

    expect(server.count('/auth/logout')).toBe(1);
  });

  it('повтор запроса TanStack Query отключён', async () => {
    const app = await boot();
    const retry = app.queryClient.getDefaultOptions().queries?.retry;

    expect(typeof retry).toBe('function');
    const decide = retry as (count: number, error: unknown) => boolean;
    expect(decide(0, new app.Unauthenticated(401, EXPIRED))).toBe(false);
    // Обычная сетевая ошибка повтор по-прежнему заслуживает.
    expect(decide(0, new Error('offline'))).toBe(true);
  });
});

describe('AuthProvider', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('при годном входе рисует приложение и никуда не уводит', async () => {
    const app = await boot();
    renderApp(app);

    expect(screen.getByText('Лента чата')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('на 401 стирает токен, гасит сокет и уводит на форму входа', async () => {
    const app = await boot();
    renderApp(app);
    await waitFor(() => expect(app.session.sessionStatus()).toBe('authorized'));

    server.rooms = 401;
    await expect401(app, app.client.get('/rooms'));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
    expect(app.token.authToken()).toBeNull();
    expect(suspendRealtime).toHaveBeenCalled();
    // Восстанавливать нечего: автоматических попыток вернуть вход нет.
    expect(server.count('/sanctum/csrf-cookie')).toBe(0);
  });

  it('выход в соседней вкладке уводит и эту', async () => {
    const app = await boot();
    renderApp(app);
    await waitFor(() => expect(app.session.sessionStatus()).toBe('authorized'));

    await act(async () => {
      localStorage.removeItem('chat.auth-token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'chat.auth-token', newValue: null }));
    });

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
  });
});
