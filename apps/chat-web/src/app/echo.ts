// Единственный экземпляр Laravel Echo (Reverb) создаётся из runtime-конфига
// и передаётся feature-пакетам через EchoAdapter (§4.2).
import { EchoAdapter, type RealtimeAdapter } from '@vendor/chat';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { RuntimeConfig } from './runtime-config';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

let adapter: RealtimeAdapter | null = null;

export function createRealtimeAdapter(config: RuntimeConfig): RealtimeAdapter | null {
  if (adapter) return adapter;
  if (!config.reverb.appKey) return null;

  window.Pusher = Pusher;

  // Sanctum SPA: /broadcasting/auth — stateful-маршрут, требует XSRF-токен
  // (Echo не читает cookie самостоятельно).
  const echo = new Echo({
    broadcaster: 'reverb',
    key: config.reverb.appKey,
    wsHost: config.reverb.host,
    wsPort: Number(config.reverb.port),
    wssPort: Number(config.reverb.port),
    forceTLS: config.reverb.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        get 'X-XSRF-TOKEN'() {
          return readCookie('XSRF-TOKEN') ?? '';
        },
      },
    },
  });

  adapter = new EchoAdapter(echo as never);
  return adapter;
}

export function realtimeAdapter(): RealtimeAdapter | null {
  return adapter;
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
