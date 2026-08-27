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

/** Имя кеша изображений: то же, что и в `public/sw.js`. */
const IMAGE_CACHE = 'chat-images-v1';

/**
 * Полная очистка кеша изображений. Приказ отдаём worker'у — он владелец
 * кеша; если worker не установлен (незащищённый контекст, отказ политики),
 * удаляем кеш прямо из окна: `caches` доступен и здесь.
 */
export async function clearImageCache(): Promise<void> {
  const controller = isServiceWorkerSupported() ? navigator.serviceWorker.controller : null;

  if (controller) {
    controller.postMessage('clear-images');

    return;
  }

  try {
    await globalThis.caches?.delete(IMAGE_CACHE);
  } catch {
    // Хранилище недоступно — чистить нечего, выход не должен на этом падать.
  }
}

const LAST_USER_KEY = 'chat.last-user';

/**
 * Кто входил на этом устройстве в прошлый раз. Предохранитель к очистке при
 * выходе: вход другим человеком без явного выхода тоже не должен оставлять
 * ему чужие фотографии (design 5).
 */
export function forgetImagesOfAnotherUser(userId: string): void {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(LAST_USER_KEY);
    localStorage.setItem(LAST_USER_KEY, userId);
  } catch {
    // Приватный режим: память о прошлом входе не переживёт вкладку.
  }

  if (previous !== null && previous !== userId) void clearImageCache();
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
