import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Реальный Echo тянет pusher-js и открывает сокет: в тесте нам важно лишь то,
// что приложение вовремя его гасит и поднимает.
const suspendRealtime = vi.fn();
const resumeRealtime = vi.fn();

vi.mock('../src/app/echo', () => ({
  suspendRealtime,
  resumeRealtime,
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
    if (url.includes('/sanctum/csrf-cookie')) return reply(204, null);
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

let silentRecovery = false;

interface Harness {
  session: typeof import('../src/app/session');
  client: import('@vendor/api-client').ApiClient;
  AuthProvider: typeof import('../src/app/auth').AuthProvider;
  queryClient: QueryClient;
  Unauthenticated: typeof import('@vendor/api-client').UnauthenticatedError;
}

/**
 * Состояние сессии живёт в модуле на время жизни страницы, поэтому каждый
 * случай поднимает приложение заново.
 */
async function boot(options: { recovery?: boolean; user?: { id: string } | null } = {}): Promise<Harness> {
  vi.resetModules();
  suspendRealtime.mockClear();
  resumeRealtime.mockClear();
  assign.mockClear();
  reload.mockClear();
  server.reset();
  silentRecovery = options.recovery ?? false;
  currentUser = options.user === undefined ? { id: 'u1' } : options.user;

  vi.stubGlobal('fetch', server.handler);
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
  const { UnauthenticatedError } = await import('@vendor/api-client');

  return {
    session,
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

const expiredDialog = () => screen.queryByRole('dialog', { name: 'Сессия истекла' });

/** 401 меняет состояние провайдера, поэтому ответа ждём внутри act. */
async function expect401(app: Harness, request: Promise<unknown>): Promise<void> {
  await act(async () => {
    await expect(request).rejects.toBeInstanceOf(app.Unauthenticated);
  });
}

describe('первый 401', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('до входа не считается истёкшей сессией', async () => {
    const app = await boot({ user: null });
    app.session.markSessionEstablished; // вход ещё не состоялся

    server.me = 401;
    await expect(app.client.get('/me')).rejects.toBeInstanceOf(app.Unauthenticated);

    // Человек просто не представился: этим занимаются guard и страница входа.
    expect(app.session.sessionStatus()).toBe('authorized');
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('после входа переводит приложение в устойчивое «сессия истекла»', async () => {
    const app = await boot();
    app.session.markSessionEstablished();

    server.rooms = 401;
    await expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated);

    expect(app.session.sessionStatus()).toBe('unauthorized');
    // Экран входа не подменяет собой объяснение: человек остаётся на месте.
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('пока сессия истекла', () => {
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

  it('выход по-прежнему проходит: им пользуется сам экран', async () => {
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

  it('при живой сессии рисует приложение и ничего не перекрывает', async () => {
    const app = await boot();
    renderApp(app);

    expect(screen.getByText('Лента чата')).toBeInTheDocument();
    expect(expiredDialog()).toBeNull();
  });

  it('на 401 показывает экран поверх чата и гасит сокет', async () => {
    const app = await boot();
    renderApp(app);
    await waitFor(() => expect(app.session.sessionStatus()).toBe('authorized'));

    server.rooms = 401;
    await expect401(app, app.client.get('/rooms'));

    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());
    // Приложение не размонтировано — мигания нет, чат просто перекрыт.
    expect(screen.getByText('Лента чата')).toBeInTheDocument();
    expect(suspendRealtime).toHaveBeenCalled();
    expect(resumeRealtime).not.toHaveBeenCalled();
  });
});

describe('тихое восстановление', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('выключено установкой по умолчанию: экран показывается сразу', async () => {
    const app = await boot();
    renderApp(app);

    server.rooms = 401;
    await expect401(app, app.client.get('/rooms'));

    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());
    // Ни handshake, ни повторной проверки `/me` — попытки не было.
    expect(server.count('/sanctum/csrf-cookie')).toBe(0);
  });

  it('успех возвращает работу без экрана и поднимает сокет', async () => {
    const app = await boot({ recovery: true });
    renderApp(app);

    server.rooms = 401;
    await expect401(app, app.client.get('/rooms'));

    await waitFor(() => expect(app.session.sessionStatus()).toBe('authorized'));
    expect(expiredDialog()).toBeNull();
    await waitFor(() => expect(resumeRealtime).toHaveBeenCalled());
  });

  it('неудача показывает экран и делает ровно одну попытку', async () => {
    const app = await boot({ recovery: true });
    renderApp(app);

    server.rooms = 401;
    server.me = 401;
    await act(async () => {
      await Promise.all([
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
        expect(app.client.get('/rooms')).rejects.toBeInstanceOf(app.Unauthenticated),
      ]);
    });

    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());
    // Три ответа 401 — один инцидент и одна попытка восстановления.
    expect(server.count('/sanctum/csrf-cookie')).toBe(1);
  });
});

describe('экран «Сессия истекла»', () => {
  beforeEach(() => vi.unstubAllGlobals());

  async function openExpired() {
    const app = await boot();
    renderApp(app);
    server.rooms = 401;
    await expect401(app, app.client.get('/rooms'));
    await waitFor(() => expect(expiredDialog()).toBeInTheDocument());

    return app;
  }

  it('забирает фокус и не закрывается по Escape', async () => {
    await openExpired();

    expect(screen.getByRole('button', { name: 'Войти снова' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(expiredDialog()).toBeInTheDocument();
  });

  it('держит фокус внутри: за последней кнопкой снова первая', async () => {
    await openExpired();

    screen.getByRole('button', { name: 'Обновить страницу' }).focus();
    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Войти снова' })).toHaveFocus();
  });

  it('«Войти снова» завершает сессию, чистит кэш и уводит на вход', async () => {
    const app = await openExpired();
    app.queryClient.setQueryData(['identity', 'me'], { id: 'u1' });

    await userEvent.click(screen.getByRole('button', { name: 'Войти снова' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
    expect(server.count('/auth/logout')).toBe(1);
    expect(app.queryClient.getQueryData(['identity', 'me'])).toBeUndefined();
    expect(suspendRealtime).toHaveBeenCalled();
  });

  it('«Обновить страницу» перезагружает приложение', async () => {
    await openExpired();

    await userEvent.click(screen.getByRole('button', { name: 'Обновить страницу' }));

    expect(reload).toHaveBeenCalled();
  });
});
