import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PREWARM_CONCURRENCY,
  prewarmImages,
  resetImagePrewarm,
  useImagePrewarm,
} from '../src/app/image-prewarm';

/** Сеть, которую можно держать открытой: так видно предел параллельности. */
function heldNetwork() {
  const open: Array<() => void> = [];
  const fetchMock = vi.fn(
    () =>
      new Promise<unknown>((resolve) => {
        open.push(() => resolve({ ok: true }));
      }),
  );
  vi.stubGlobal('fetch', fetchMock);

  return {
    fetchMock,
    /** Завершает count самых давних запросов. */
    async settle(count: number) {
      for (const done of open.splice(0, count)) done();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe('прогрев изображений', () => {
  beforeEach(() => {
    resetImagePrewarm();
    // requestIdleCallback в jsdom нет: прогрев стартует по таймеру-фолбэку.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const idle = async () => {
    await vi.advanceTimersByTimeAsync(300);
  };

  it('держит не больше трёх одновременных обращений', async () => {
    const { fetchMock, settle } = heldNetwork();

    prewarmImages(Array.from({ length: 8 }, (_, index) => `/api/v1/attachments/a${index}/thumb`));
    await idle();

    expect(fetchMock).toHaveBeenCalledTimes(PREWARM_CONCURRENCY);

    await settle(1);
    expect(fetchMock).toHaveBeenCalledTimes(PREWARM_CONCURRENCY + 1);

    await settle(3);
    expect(fetchMock).toHaveBeenCalledTimes(PREWARM_CONCURRENCY + 4);
  });

  it('не запрашивает повторно уже прогретое и пропускает пустые адреса', async () => {
    const { fetchMock, settle } = heldNetwork();

    prewarmImages(['/thumb/a', '/thumb/b', null, undefined, '']);
    await idle();
    await settle(2);

    prewarmImages(['/thumb/a', '/thumb/b', '/thumb/c']);
    await idle();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/thumb/a', '/thumb/b', '/thumb/c']);
  });

  it('не начинается раньше простоя и не задерживает отправку сообщения', async () => {
    const { fetchMock, settle } = heldNetwork();

    prewarmImages(Array.from({ length: 20 }, (_, index) => `/thumb/${index}`));

    // До простоя прогрев не занял ни одного соединения.
    expect(fetchMock).not.toHaveBeenCalled();

    await idle();
    expect(fetchMock).toHaveBeenCalledTimes(PREWARM_CONCURRENCY);

    // Отправка идёт своим запросом и не ждёт очереди прогрева: она отвечает,
    // пока все прогревочные обращения ещё висят открытыми.
    const send = fetch('/api/v1/rooms/r1/messages');
    await settle(0);
    const sent = await Promise.race([send.then(() => 'sent'), Promise.resolve('blocked')]);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/rooms/r1/messages');
    // Очередь по-прежнему ограничена: живой запрос не увеличил прогрев.
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/thumb/'))).toHaveLength(
      PREWARM_CONCURRENCY,
    );
    expect(sent).toBe('blocked');
  });

  it('греет адреса из уже полученных данных и не ходит в API за новыми', async () => {
    const { fetchMock } = heldNetwork();

    function Rooms({ photos }: { photos: (string | null)[] }) {
      useImagePrewarm(photos);

      return <ul>{photos.map((photo) => <li key={photo}>{photo}</li>)}</ul>;
    }

    const { rerender } = render(<Rooms photos={['/api/v1/room-photos/p1/thumb', null]} />);
    await idle();

    // Тот же список после перерисовки — нового прогрева не порождает.
    rerender(<Rooms photos={['/api/v1/room-photos/p1/thumb', null]} />);
    await idle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/room-photos/p1/thumb', { credentials: 'include' });
  });
});
