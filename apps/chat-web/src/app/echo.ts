// Единственный экземпляр Laravel Echo (Reverb) создаётся из runtime-конфига
// и передаётся feature-пакетам через EchoAdapter (§4.2).
import { EchoAdapter, type RealtimeAdapter } from '@vendor/chat';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { RuntimeConfig } from './runtime-config';
import { authToken } from './token';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

let adapter: RealtimeAdapter | null = null;
let connection: Echo<'reverb'> | null = null;

/**
 * Адрес WebSocket. По умолчанию — origin страницы: в self-hosted стеке
 * Reverb стоит за тем же reverse proxy, что и SPA (ADR-003/007), поэтому
 * жёстко зашитый хост только ломает доступ с других адресов.
 * Явные значения в config.json переопределяют это поведение.
 */
function socketEndpoint(config: RuntimeConfig): { host: string; port: number; tls: boolean } {
  const scheme = config.reverb.scheme || window.location.protocol.replace(':', '');
  const tls = scheme === 'https';
  const port = Number(config.reverb.port) || Number(window.location.port) || (tls ? 443 : 80);

  return { host: config.reverb.host || window.location.hostname, port, tls };
}

export function createRealtimeAdapter(config: RuntimeConfig): RealtimeAdapter | null {
  if (adapter) return adapter;
  if (!config.reverb.appKey) return null;

  window.Pusher = Pusher;
  const socket = socketEndpoint(config);

  // Канал авторизуется тем же токеном, что и HTTP (ADR-012).
  const echo = new Echo({
    broadcaster: 'reverb',
    key: config.reverb.appKey,
    wsHost: socket.host,
    wsPort: socket.port,
    wssPort: socket.port,
    forceTLS: socket.tls,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        // Геттер, а не значение: после повторного входа сокет обязан
        // авторизоваться новым токеном, а не тем, что был при создании Echo.
        get Authorization() {
          const token = authToken();

          return token === null ? '' : `Bearer ${token}`;
        },
      },
    },
  });

  connection = echo as unknown as Echo<'reverb'>;
  adapter = new EchoAdapter(echo as never);
  return adapter;
}

export function realtimeAdapter(): RealtimeAdapter | null {
  return adapter;
}

/**
 * Вход недействителен — сокет замолкает. Без этого Reverb бесконечно переспрашивает
 * `/broadcasting/auth`, получает 401 и переподключается по кругу: в консоли
 * шум, в интерфейсе мигание, на сервере лишняя нагрузка.
 */
export function suspendRealtime(): void {
  connection?.disconnect();
}

