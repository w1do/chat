import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ApiClient } from '@vendor/api-client';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { identityApi } from '../src/api';
import { IdentityProvider, useAuth } from '../src/hooks/useAuth';
import { setAuthTokenStore, type AuthTokenStore } from '../src/token-store';

const user = { id: 'u1', login: 'ann', name: 'Аня' };

/** Хранилище приложения: пакет получает его снаружи (§4.2). */
function memoryStore(initial: string | null = null): AuthTokenStore & { value: string | null } {
  const listeners = new Set<() => void>();

  return {
    value: initial,
    read() {
      return this.value;
    },
    save(token: string) {
      this.value = token;
      for (const listener of listeners) listener();
    },
    clear() {
      this.value = null;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

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
let store: ReturnType<typeof memoryStore>;

function client() {
  return new ApiClient({
    baseUrl: '/api/v1',
    authToken: () => store.read(),
    fetchFn: fetchFn as unknown as typeof fetch,
  });
}

beforeEach(() => {
  store = memoryStore();
  setAuthTokenStore(store);
  fetchFn = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return reply(200, { data: user, token: 'fresh-token' });
    }
    if (url.includes('/auth/logout')) return reply(204);
    if (url.includes('/me')) return reply(200, { data: user });

    return reply(404, { code: 'not_found', message: 'x', details: {}, trace_id: null });
  });
});

afterEach(() => {
  setAuthTokenStore(memoryStore());
});

describe('токен из ответа входа', () => {
  it('сохраняется при входе', async () => {
    await identityApi.login(client(), { login: 'ann', password: 'secret' });

    expect(store.read()).toBe('fresh-token');
  });

  it('сохраняется при регистрации', async () => {
    await identityApi.register(client(), { login: 'ann', password: 'secret' });

    expect(store.read()).toBe('fresh-token');
  });

  it('стирается при выходе', async () => {
    store.save('old-token');

    await identityApi.logout(client());

    expect(store.read()).toBeNull();
  });

  it('стирается и когда выход не дошёл до сервера', async () => {
    store.save('old-token');
    fetchFn = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(identityApi.logout(client())).rejects.toBeTruthy();
    expect(store.read()).toBeNull();
  });
});

describe('восстановление входа при старте', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <IdentityProvider client={client()}>{children}</IdentityProvider>
    </QueryClientProvider>
  );

  it('без токена не спрашивает /me вовсе', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/me'))).toBe(false);
  });

  it('с токеном возвращает того же человека', async () => {
    store.save('secret-token');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(user));
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/me'))).toBe(true);
  });
});
