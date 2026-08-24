import type Echo from 'laravel-echo';
import type { PresenceEvent, RoomEvent } from '../realtime/eventMap';
import { PRESENCE_EVENT_NAMES, ROOM_EVENT_NAMES } from '../realtime/eventMap';
import type {
  ConnectionState,
  PresenceMember,
  RealtimeAdapter,
  RoomSubscription,
} from './RealtimeAdapter';

/** Адаптер над экземпляром Laravel Echo, созданным приложением (§4.2). */
export class EchoAdapter implements RealtimeAdapter {
  constructor(private readonly echo: Echo<'reverb'>) {}

  subscribeRoom(roomId: string, onEvent: (event: RoomEvent) => void): RoomSubscription {
    const channel = this.echo.private(`room.${roomId}`);
    for (const name of ROOM_EVENT_NAMES) {
      // Reverb шлёт имя события как broadcastAs; точка в начале — «без namespace».
      channel.listen(`.${name}`, (payload: RoomEvent) => onEvent(payload));
    }

    return { unsubscribe: () => this.echo.leave(`room.${roomId}`) };
  }

  subscribePresence(
    roomId: string,
    handlers: {
      onEvent: (event: PresenceEvent) => void;
      onHere?: (members: PresenceMember[]) => void;
      onJoining?: (member: PresenceMember) => void;
      onLeaving?: (member: PresenceMember) => void;
    },
  ): RoomSubscription {
    const channel = this.echo.join(`room.${roomId}.presence`);
    channel.here((members: PresenceMember[]) => handlers.onHere?.(members));
    channel.joining((member: PresenceMember) => handlers.onJoining?.(member));
    channel.leaving((member: PresenceMember) => handlers.onLeaving?.(member));
    for (const name of PRESENCE_EVENT_NAMES) {
      channel.listen(`.${name}`, (payload: PresenceEvent) => handlers.onEvent(payload));
    }

    return { unsubscribe: () => this.echo.leave(`room.${roomId}.presence`) };
  }

  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    const cleanups: Array<() => void> = [];

    // Основной источник — состояние pusher-соединения…
    const connection = (
      this.echo.connector as {
        pusher?: { connection?: { bind: Function; unbind: Function } };
        connection?: { bind: Function; unbind: Function };
      }
    );
    const socket = connection.pusher?.connection ?? connection.connection;

    if (socket) {
      const handler = ({ current }: { current: string }) => {
        const map: Record<string, ConnectionState> = {
          connected: 'connected',
          connecting: 'connecting',
          unavailable: 'reconnecting',
          failed: 'disconnected',
          disconnected: 'disconnected',
        };
        listener(map[current] ?? 'connecting');
      };
      socket.bind('state_change', handler);
      cleanups.push(() => socket.unbind('state_change', handler));
    }

    // …плюс сетевые события браузера: обрыв канала виден и без смены состояния сокета.
    if (typeof window !== 'undefined') {
      const goOffline = () => listener('reconnecting');
      const goOnline = () => listener('connected');
      window.addEventListener('offline', goOffline);
      window.addEventListener('online', goOnline);
      cleanups.push(() => {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }
}
