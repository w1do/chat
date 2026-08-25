import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Обработчики service worker проверяем как чистые функции: сам worker живёт
 * вне окна и в jsdom не запускается.
 */
type Listener = (event: unknown) => void;

function loadWorker(): { listeners: Map<string, Listener>; registration: Record<string, ReturnType<typeof vi.fn>>; clients: Record<string, ReturnType<typeof vi.fn>> } {
  const listeners = new Map<string, Listener>();
  const registration = { showNotification: vi.fn() };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn(), claim: vi.fn() };

  const scope = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration,
    clients,
    skipWaiting: vi.fn(),
    caches: { open: vi.fn().mockResolvedValue({ addAll: vi.fn() }), keys: vi.fn().mockResolvedValue([]), match: vi.fn() },
  };

  const source = readWorkerSource();
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', source)(scope, scope.caches);

  return { listeners, registration, clients };
}

function readWorkerSource(): string {
  // Читаем ровно тот файл, который уедет в сборку.
  return readFileSync(resolve(__dirname, '../public/sw.js'), 'utf8');
}

describe('service worker', () => {
  it('показывает уведомление из полезной нагрузки push', async () => {
    const { listeners, registration } = loadWorker();
    const waits: Promise<unknown>[] = [];

    listeners.get('push')?.({
      data: { json: () => ({ title: 'Семья', body: 'Алексей: пирог', url: '/rooms/r1', tag: 'message:r1' }) },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(registration.showNotification).toHaveBeenCalledWith(
      'Семья',
      expect.objectContaining({ body: 'Алексей: пирог', tag: 'message:r1', data: { url: '/rooms/r1' } }),
    );
  });

  it('переиспользует открытое окно вместо второго', async () => {
    const { listeners, clients } = loadWorker();
    const focus = vi.fn();
    const navigate = vi.fn();
    clients.matchAll.mockResolvedValue([{ focus, navigate }]);

    const waits: Promise<unknown>[] = [];
    listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { url: '/rooms/r1' } },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(navigate).toHaveBeenCalledWith('/rooms/r1');
    expect(focus).toHaveBeenCalled();
    expect(clients.openWindow).not.toHaveBeenCalled();
  });

  it('открывает новое окно, если приложение закрыто', async () => {
    const { listeners, clients } = loadWorker();
    clients.matchAll.mockResolvedValue([]);

    const waits: Promise<unknown>[] = [];
    listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { url: '/rooms/r2' } },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);

    expect(clients.openWindow).toHaveBeenCalledWith('/rooms/r2');
  });

  it('не вмешивается в запросы к API', () => {
    const { listeners } = loadWorker();
    const respondWith = vi.fn();

    listeners.get('fetch')?.({ request: { mode: 'cors', url: '/api/v1/rooms' }, respondWith });

    expect(respondWith).not.toHaveBeenCalled();
  });
});
