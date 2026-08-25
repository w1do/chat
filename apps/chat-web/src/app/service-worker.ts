/**
 * Регистрация service worker: он обслуживает push-уведомления и экран без
 * связи. Обновление не применяется молча — приложение сообщает о нём и ждёт
 * решения пользователя.
 */
export interface ServiceWorkerHandle {
  registration: ServiceWorkerRegistration | null;
  /** Вызывается, когда новая версия скачана и ждёт применения. */
  onUpdateReady?: (apply: () => void) => void;
}

export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

let registration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(
  onUpdateReady?: (apply: () => void) => void,
): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;

  try {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Незащищённый контекст или запрет политики — приложение работает и без него.
    return null;
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration?.installing;
    if (!installing) return;

    installing.addEventListener('statechange', () => {
      // Новая версия готова только если старая всё ещё управляет страницей.
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        onUpdateReady?.(() => {
          installing.postMessage('skip-waiting');
          window.location.reload();
        });
      }
    });
  });

  return registration;
}

/** Уже зарегистрированный worker: нужен подписке на push. */
export async function serviceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}
