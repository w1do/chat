/* Service worker чата: push-уведомления, честный экран без сети и кеш
 * изображений на устройстве.
 *
 * Данные переписки в кеш не складываются намеренно: она живёт в приложении и
 * досинхронизируется после reconnect — закешированная лента показывала бы
 * вчерашние сообщения как свежие. Кешируем только оболочку и изображения.
 */
const SHELL_CACHE = 'chat-shell-v2';
const IMAGE_CACHE = 'chat-images-v1';
const KEPT_CACHES = [SHELL_CACHE, IMAGE_CACHE];
const OFFLINE_URL = '/offline.html';

/* Пределы кеша изображений (design 3). Записи считаем штуками, а не байтами:
   миниатюра webp 640 px весит 50–150 КБ, аватарка — единицы, поэтому верхняя
   граница объёма получается порядка десятков мегабайт по построению. */
const IMAGE_CACHE_MAX_ENTRIES = 400;
const IMAGE_CACHE_MAX_ENTRY_KB = 2048;

/* Что считаем изображением: миниатюры вложений и картинки профиля и комнаты.
   Оригиналы вложений сюда не входят — с телефона это могут быть десятки МБ. */
const IMAGE_PATHS = [
  /\/attachments\/[^/]+\/thumb$/,
  /\/avatars\/[^/]+(\/thumb)?$/,
  /\/room-photos\/[^/]+(\/thumb)?$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEPT_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Новая версия применяется по команде приложения, а не молча посреди работы.
// Кеш изображений тоже чистится по команде: на общем устройстве чужие
// фотографии не должны пережить выход (spec platform/image-cache).
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'clear-images') event.waitUntil(caches.delete(IMAGE_CACHE));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Изображения — «сначала кеш»: однажды показанная картинка открывается
  // мгновенно и без сети (spec platform/image-cache).
  if (request.method === 'GET' && isCacheableImage(request)) {
    event.respondWith(imageFirstFromCache(event));

    return;
  }

  // Дальше только навигация: данные API и WebSocket не трогаем вовсе.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
    ),
  );
});

function isCacheableImage(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  if (url.origin !== self.location.origin) return false;

  return IMAGE_PATHS.some((pattern) => pattern.test(url.pathname));
}

/** Кеш, потом сеть. Любой сбой хранилища заканчивается обычным запросом. */
async function imageFirstFromCache(event) {
  const request = event.request;
  let cache = null;

  try {
    cache = await caches.open(IMAGE_CACHE);
    const hit = await cache.match(request);

    if (hit) {
      // Копию снимаем сразу: отданный ответ читает браузер, и клонировать
      // его потом уже нельзя.
      event.waitUntil(touchImage(cache, request, hit.clone()));

      return hit;
    }
  } catch {
    // Хранилище недоступно — показ идёт из сети, как без worker'а вовсе.
    cache = null;
  }

  const response = await fetch(request);
  if (cache !== null) event.waitUntil(storeImage(cache, request, response.clone()));

  return response;
}

/**
 * Попадание переписывает запись. Cache Storage не хранит метаданных, но
 * keys() отдаёт записи в порядке вставки — перезапись уносит запись в конец,
 * и подрезка с начала оказывается вытеснением давнего (design 3).
 */
async function touchImage(cache, request, copy) {
  try {
    await cache.delete(request);
    await cache.put(request, copy);
  } catch {
    // Перенос записи в конец — только порядок вытеснения, не показ.
  }
}

async function storeImage(cache, request, response) {
  // Ошибка на устройстве не оседает: иначе 404 неготовой миниатюры сделал бы
  // её «навсегда неготовой» именно здесь (spec platform/image-cache).
  if (!response.ok) return;

  // Длину берём из заголовка: считать байты ради решения дороже, чем не
  // закешировать редкий ответ без Content-Length.
  const bytes = Number(response.headers.get('content-length') ?? 0);
  if (bytes > IMAGE_CACHE_MAX_ENTRY_KB * 1024) return;

  try {
    await cache.put(request, response);
    await trimImages(cache);
  } catch {
    // Устройство отказало в хранении — изображение уже отдано из сети.
  }
}

async function trimImages(cache) {
  const keys = await cache.keys();

  for (let index = 0; index < keys.length - IMAGE_CACHE_MAX_ENTRIES; index++) {
    await cache.delete(keys[index]);
  }
}

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
