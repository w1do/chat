import { useCallback, useEffect, useState } from 'react';
import { apiClient } from './api';
import { runtimeConfig } from './runtime-config';
import { isServiceWorkerSupported, serviceWorkerReady } from './service-worker';

/**
 * Подписка устройства на push. Состояние выводится из фактов — разрешение
 * браузера и наличие подписки, — а не хранится отдельно: иначе тумблер и
 * реальность разъезжаются.
 */
export type PushState =
  | 'unsupported' // браузер не умеет push
  | 'not-configured' // сервер без ключей VAPID
  | 'needs-install' // iPhone: push работает только у установленного приложения
  | 'denied' // разрешение запрещено в браузере
  | 'off'
  | 'on';

export function pushPublicKey(): string {
  return runtimeConfig().push?.publicKey ?? '';
}

/** Установленное приложение: у iOS это условие работы push. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** base64url из конфигурации → формат, который ждёт браузер. */
function applicationServerKey(key: string): ArrayBuffer {
  const padded = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function usePushSubscription(): {
  state: PushState;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [state, setState] = useState<PushState>('off');
  const [busy, setBusy] = useState(false);

  const detect = useCallback(async () => {
    if (!isServiceWorkerSupported() || typeof window.PushManager === 'undefined') {
      // На iOS push появляется только после установки приложения.
      setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');

      return;
    }

    if (pushPublicKey() === '') {
      setState('not-configured');

      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');

      return;
    }

    const registration = await serviceWorkerReady();
    const subscription = await registration?.pushManager.getSubscription();

    setState(subscription ? 'on' : 'off');
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');

        return;
      }

      const registration = await serviceWorkerReady();
      if (!registration) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(pushPublicKey()),
      });

      await apiClient().post('/push-subscriptions', { body: subscription.toJSON() });
      setState('on');
    } catch {
      // Отказ браузера или сети: тумблер честно остаётся выключенным.
      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await serviceWorkerReady();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Сначала сервер: иначе он продолжит слать на снятую подписку.
        await apiClient().delete('/push-subscriptions', { body: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }

      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
