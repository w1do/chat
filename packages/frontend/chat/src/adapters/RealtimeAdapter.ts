// Контракт real-time транспорта: конкретный Echo приходит от приложения (§4.2).

import type { PresenceEvent, RoomEvent, UserEvent } from '../realtime/eventMap';

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface PresenceMember {
  id: string;
  name: string;
}

export interface RoomSubscription {
  unsubscribe(): void;
}

export interface RealtimeAdapter {
  subscribeRoom(roomId: string, onEvent: (event: RoomEvent) => void): RoomSubscription;
  subscribePresence(
    roomId: string,
    handlers: {
      onEvent: (event: PresenceEvent) => void;
      onHere?: (members: PresenceMember[]) => void;
      onJoining?: (member: PresenceMember) => void;
      onLeaving?: (member: PresenceMember) => void;
    },
  ): RoomSubscription;
  /**
   * Личный канал пользователя: сюда приходит ход его собственных операций
   * (пересказ документа). Необязателен — без него клиент опрашивает HTTP.
   */
  subscribeUser?(userId: string, onEvent: (event: UserEvent) => void): RoomSubscription;
  onConnectionChange(listener: (state: ConnectionState) => void): () => void;
}
