import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, UnauthenticatedError } from '../src';

/** Ответ в формате, который читает клиент. */
function reply(status: number, body: unknown = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

let fetchFn: ReturnType<typeof vi.fn>;

function client(options: Partial<ConstructorParameters<typeof ApiClient>[0]> = {}) {
  return new ApiClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch, ...options });
}

/** Заголовки последнего запроса. */
function headers(): Record<string, string> {
  return (fetchFn.mock.calls.at(-1)?.[1] as { headers: Record<string, string> }).headers;
}

beforeEach(() => {
  fetchFn = vi.fn(async () => reply(200, { data: [] }));
});

describe('ApiClient', () => {
  it('представляется токеном заголовком Authorization', async () => {
    await client({ authToken: () => 'secret-token' }).get('/rooms');

    expect(headers().Authorization).toBe('Bearer secret-token');
  });

  it('перечитывает токен на каждый запрос', async () => {
    let token = 'first-token';
    const api = client({ authToken: () => token });

    await api.get('/rooms');
    expect(headers().Authorization).toBe('Bearer first-token');

    // Повторный вход выдал новый токен — следующий запрос уходит уже с ним.
    token = 'second-token';
    await api.get('/rooms');
    expect(headers().Authorization).toBe('Bearer second-token');
  });

  it('без токена не шлёт заголовок вовсе', async () => {
    await client({ authToken: () => null }).get('/rooms');

    expect(headers().Authorization).toBeUndefined();
  });

  it('не шлёт cookie и CSRF-заголовок', async () => {
    await client({ authToken: () => 'secret-token' }).post('/rooms', { body: { name: 'Дом' } });

    const init = fetchFn.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(init.credentials).toBeUndefined();
    expect(headers()['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('не делает CSRF-handshake перед мутацией', async () => {
    await client({ authToken: () => 'secret-token' }).post('/rooms', { body: { name: 'Дом' } });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/sanctum/csrf-cookie'))).toBe(false);
  });

  it('на 419 не повторяет запрос: CSRF в схеме нет', async () => {
    fetchFn = vi.fn(async () => reply(419, { code: 'csrf', message: 'mismatch', details: {}, trace_id: null }));

    await expect(client().post('/rooms', { body: {} })).rejects.toMatchObject({ status: 419 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('токен не попадает в адрес запроса', async () => {
    await client({ authToken: () => 'secret-token' }).get('/rooms', { query: { limit: 10 } });

    expect(String(fetchFn.mock.calls.at(-1)?.[0])).not.toContain('secret-token');
  });

  it('на 401 зовёт обработчик приложения и бросает типизированную ошибку', async () => {
    fetchFn = vi.fn(async () =>
      reply(401, { code: 'unauthenticated', message: 'Unauthenticated.', details: {}, trace_id: null }),
    );
    const onUnauthenticated = vi.fn();

    await expect(client({ onUnauthenticated }).get('/rooms')).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('подавленный запрос не уходит в сеть', async () => {
    const api = client({ sessionSuspended: (path) => path !== '/auth/login' });

    await expect(api.get('/rooms')).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(fetchFn).not.toHaveBeenCalled();

    // Публичный путь по-прежнему проходит.
    await api.post('/auth/login', { body: {} });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('отдаёт заголовки авторизации тем, кто ходит мимо клиента', () => {
    expect(client({ authToken: () => 'secret-token' }).authHeaders()).toEqual({
      Authorization: 'Bearer secret-token',
    });
    expect(client({ authToken: () => null }).authHeaders()).toEqual({});
  });
});
