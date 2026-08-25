/* Service worker чата: push-уведомления и честный экран без сети.
 *
 * Данные в кеш не складываются намеренно: переписка живёт в приложении и
 * досинхронизируется после reconnect — закешированная лента показывала бы
 * вчерашние сообщения как свежие. Кешируем только оболочку.
 */
const SHELL_CACHE = 'chat-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Новая версия применяется по команде приложения, а не молча посреди работы.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Только навигация: API и WebSocket не трогаем вовсе.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
    ),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Чат', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Чат', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Одна комната — одно уведомление: следующее заменяет предыдущее.
      tag: payload.tag ?? 'chat',
      renotify: true,
      data: { url: payload.url ?? '/' },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Второе окно не открываем: используем уже запущенное приложение.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(url);

          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    }),
  );
});

/* Браузер перевыпускает и отзывает подписку сам — Chrome на Android делает это
   регулярно. Пока это событие никто не слушал, устройство молча выпадало из
   рассылки навсегда: сервер удалял подписку по ответу 410, а новая никуда не
   уходила. Приложение в этот момент может быть закрыто, поэтому ключ берём не
   из его памяти, а из той же /config.json. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(resubscribe());
});

async function resubscribe() {
  const config = await fetch('/config.json', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  const key = config?.push?.publicKey;
  if (!key) return;

  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(key),
  });

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  // Сессия ходит cookie'ами, поэтому нужен и CSRF-заголовок. Прочитать cookie
  // из worker можно только Cookie Store API; где его нет, подписку донесёт
  // приложение при следующем запуске — оно сверяет её с сервером.
  const token = await xsrfToken();
  if (token) headers['X-XSRF-TOKEN'] = token;

  await fetch(`${config.apiBaseUrl ?? '/api/v1'}/push-subscriptions`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(subscription.toJSON ? subscription.toJSON() : subscription),
  });
}

async function xsrfToken() {
  try {
    const cookie = await self.cookieStore?.get('XSRF-TOKEN');

    return cookie ? decodeURIComponent(cookie.value) : null;
  } catch {
    return null;
  }
}

/** base64url из конфигурации → формат, который ждёт браузер. */
function applicationServerKey(key) {
  const padded = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binary = self.atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}
