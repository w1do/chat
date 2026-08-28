import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'chat.auth-token';

/**
 * Хранилище токена живёт в модуле, поэтому каждый случай загружает его
 * заново — так же, как это делает открытие страницы.
 */
async function load() {
  vi.resetModules();

  return import('../src/app/token');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('хранилище токена доступа', () => {
  it('переживает перезагрузку страницы', async () => {
    const first = await load();
    first.storeAuthToken('secret-token');

    expect(localStorage.getItem(KEY)).toBe('secret-token');

    // Новая загрузка страницы читает то же значение.
    const second = await load();
    expect(second.authToken()).toBe('secret-token');
  });

  it('стирает значение при выходе', async () => {
    const token = await load();
    token.storeAuthToken('secret-token');

    token.clearAuthToken();

    expect(token.authToken()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('работает в пределах вкладки, когда хранилище недоступно', async () => {
    // Приватный режим или запрет политики: доступ к localStorage бросает.
    const denied = () => {
      throw new Error('denied');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied);

    const token = await load();

    expect(() => token.storeAuthToken('secret-token')).not.toThrow();
    // Вход живёт в памяти вкладки и не переживёт её закрытия (spec).
    expect(token.authToken()).toBe('secret-token');
    expect(() => token.clearAuthToken()).not.toThrow();
    expect(token.authToken()).toBeNull();
  });

  it('узнаёт о выходе в соседней вкладке', async () => {
    const token = await load();
    token.storeAuthToken('secret-token');

    const changed = vi.fn();
    token.subscribeAuthToken(changed);

    // Соседняя вкладка вышла: событие `storage` приходит только сюда.
    localStorage.removeItem(KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));

    expect(token.authToken()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('узнаёт о входе в соседней вкладке', async () => {
    const token = await load();

    localStorage.setItem(KEY, 'fresh-token');
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'fresh-token' }));

    expect(token.authToken()).toBe('fresh-token');
  });

  it('не реагирует на чужие ключи', async () => {
    const token = await load();
    token.storeAuthToken('secret-token');

    window.dispatchEvent(new StorageEvent('storage', { key: 'chat.settings', newValue: 'x' }));

    expect(token.authToken()).toBe('secret-token');
  });
});
