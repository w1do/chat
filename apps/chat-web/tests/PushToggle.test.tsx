import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn().mockResolvedValue({ data: { id: 'sub-1' } });
const remove = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/app/api', () => ({ apiClient: () => ({ post, delete: remove }) }));

const runtime = { push: { publicKey: 'BKeyForTests' } };
vi.mock('../src/app/runtime-config', () => ({ runtimeConfig: () => runtime }));

const ready = vi.fn();
vi.mock('../src/app/service-worker', () => ({
  isServiceWorkerSupported: () => true,
  serviceWorkerReady: () => ready(),
}));

import { usePushSubscription } from '../src/app/push';

function pushManager(existing: unknown = null) {
  const subscription = {
    endpoint: 'https://push.example.com/device',
    toJSON: () => ({ endpoint: 'https://push.example.com/device', keys: { p256dh: 'k', auth: 'a' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };

  return {
    manager: {
      getSubscription: vi.fn().mockResolvedValue(existing),
      subscribe: vi.fn().mockResolvedValue(subscription),
    },
    subscription,
  };
}

describe('usePushSubscription', () => {
  beforeEach(() => {
    post.mockClear();
    remove.mockClear();
    runtime.push.publicKey = 'BKeyForTests';
    Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') },
      configurable: true,
      writable: true,
    });
  });

  it('включается: спрашивает разрешение и отправляет подписку', async () => {
    const { manager } = pushManager(null);
    ready.mockResolvedValue({ pushManager: manager });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe('off'));

    await act(() => result.current.enable());

    expect(manager.subscribe).toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/push-subscriptions', {
      body: { endpoint: 'https://push.example.com/device', keys: { p256dh: 'k', auth: 'a' } },
    });
    expect(result.current.state).toBe('on');
  });

  it('выключается: снимает подписку на сервере и в браузере', async () => {
    const { manager, subscription } = pushManager(null);
    manager.getSubscription.mockResolvedValue(subscription);
    ready.mockResolvedValue({ pushManager: manager });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe('on'));

    await act(() => result.current.disable());

    expect(remove).toHaveBeenCalledWith('/push-subscriptions', {
      body: { endpoint: 'https://push.example.com/device' },
    });
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.state).toBe('off');
  });

  it('остаётся выключённым, если разрешение отклонили', async () => {
    const { manager } = pushManager(null);
    ready.mockResolvedValue({ pushManager: manager });
    (window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission =
      vi.fn().mockResolvedValue('denied');

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe('off'));

    await act(() => result.current.enable());

    expect(post).not.toHaveBeenCalled();
    expect(result.current.state).toBe('denied');
  });

  it('объясняет, что сервер без ключей push не рассылает', async () => {
    runtime.push.publicKey = '';
    ready.mockResolvedValue({ pushManager: pushManager(null).manager });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe('not-configured'));
  });

  it('видит запрет разрешений в браузере', async () => {
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'denied', requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    });
    ready.mockResolvedValue({ pushManager: pushManager(null).manager });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe('denied'));
  });
});

describe('usePushSubscription: сверка с сервером при запуске', () => {
  beforeEach(() => {
    post.mockClear();
    runtime.push.publicKey = 'BKeyForTests';
    Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    });
  });

  it('переотправляет подписку и показывает «включено», когда сервер её принял', async () => {
    const { manager, subscription } = pushManager(null);
    manager.getSubscription.mockResolvedValue(subscription);
    ready.mockResolvedValue({ pushManager: manager });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe('on'));
    // Отвалившаяся на сервере подписка чинится сама, без участия человека.
    expect(post).toHaveBeenCalledWith('/push-subscriptions', {
      body: { endpoint: 'https://push.example.com/device', keys: { p256dh: 'k', auth: 'a' } },
    });
  });

  it('не обещает уведомлений, если сервер подписку не принял', async () => {
    const { manager, subscription } = pushManager(null);
    manager.getSubscription.mockResolvedValue(subscription);
    ready.mockResolvedValue({ pushManager: manager });
    post.mockRejectedValueOnce(new Error('сеть недоступна'));

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe('off'));
  });

  it('без подписки в браузере остаётся выключенным и никого не спрашивает', async () => {
    const { manager } = pushManager(null);
    ready.mockResolvedValue({ pushManager: manager });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe('off'));
    expect(post).not.toHaveBeenCalled();
  });
});
