import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearImageCache, forgetImagesOfAnotherUser } from '../src/app/service-worker';

const IMAGES = 'chat-images-v1';

/** Хранилище кешей окна: приложение чистит его, когда worker'а нет. */
function stubCaches() {
  const names = new Set([IMAGES, 'chat-shell-v2']);
  const storage = { delete: vi.fn(async (name: string) => names.delete(name)) };
  vi.stubGlobal('caches', storage);

  return { names, storage };
}

/** Установленный worker: приказ уходит ему, окно кеш не трогает. */
function stubController() {
  const postMessage = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker: { controller: { postMessage } } });

  return postMessage;
}

describe('очистка кеша изображений', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('приказывает worker’у очистить кеш, когда он установлен', async () => {
    const { storage } = stubCaches();
    const postMessage = stubController();

    await clearImageCache();

    expect(postMessage).toHaveBeenCalledWith('clear-images');
    // Владелец кеша — worker: окно не удаляет его вторым путём.
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('удаляет кеш сам, когда worker не установлен', async () => {
    const { names, storage } = stubCaches();
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } });

    await clearImageCache();

    expect(storage.delete).toHaveBeenCalledWith(IMAGES);
    expect(names.has(IMAGES)).toBe(false);
    // Оболочка остаётся: экран «нет связи» после выхода никуда не девается.
    expect(names.has('chat-shell-v2')).toBe(true);
  });

  it('не падает, когда хранилище недоступно вовсе', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('caches', undefined);

    await expect(clearImageCache()).resolves.toBeUndefined();
  });
});

describe('общее устройство', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('чистит кеш, когда /me вернул другого человека', () => {
    const { storage } = stubCaches();
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } });

    // Первый вход на пустом устройстве чистить нечего.
    forgetImagesOfAnotherUser('u1');
    expect(storage.delete).not.toHaveBeenCalled();

    // Тот же человек вернулся — его же фотографии остаются доступными.
    forgetImagesOfAnotherUser('u1');
    expect(storage.delete).not.toHaveBeenCalled();

    // Вошёл другой: чужих изображений на устройстве не остаётся.
    forgetImagesOfAnotherUser('u2');
    expect(storage.delete).toHaveBeenCalledWith(IMAGES);
  });
});
