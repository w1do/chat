import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Конфигурация читается из /config.json один раз и кэшируется модулем, поэтому
 * для каждого случая модуль загружается заново.
 */
async function loadWith(password?: unknown): Promise<number> {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        apiBaseUrl: '/api/v1',
        reverb: { host: '', port: '', scheme: '', appKey: 'key' },
        ai: { enabled: 'false' },
        push: { publicKey: '' },
        ...(password === undefined ? {} : { password }),
        branding: { appName: 'Чат' },
      }),
    }),
  );

  const module = await import('../src/app/runtime-config');
  await module.loadRuntimeConfig();

  return module.passwordMinLength();
}

describe('passwordMinLength', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('берёт число, заданное установкой', async () => {
    expect(await loadWith({ minLength: '12' })).toBe(12);
  });

  it('без значения работает по тому же умолчанию, что и сервер', async () => {
    // Установка ничего не задавала: сервер в этом случае требует один символ.
    expect(await loadWith(undefined)).toBe(1);
  });

  it('не верит испорченному значению', async () => {
    // envsubst подставляет строки: пустая или нечисловая не должна ломать форму.
    expect(await loadWith({ minLength: 'не число' })).toBe(1);
    expect(await loadWith({ minLength: '' })).toBe(1);
    expect(await loadWith({ minLength: '0' })).toBe(1);
  });
});

describe('passwordMinLength без загруженной конфигурации', () => {
  it('не роняет форму, а берёт умолчание сервера', async () => {
    vi.resetModules();
    const module = await import('../src/app/runtime-config');

    // Конфигурация ещё не загружена — форма всё равно обязана отрисоваться.
    expect(module.passwordMinLength()).toBe(1);
  });
});
