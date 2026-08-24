import { useEffect, useRef, useState } from 'react';
import type { RealtimeAdapter } from '../adapters/RealtimeAdapter';

export interface IncomingMessage {
  roomId: string;
  roomName: string;
  authorName: string;
  body: string;
}

interface Options {
  /** Комнаты, за которыми следим: id → имя. */
  rooms: Map<string, string>;
  currentUserId: string;
  /** Комната, открытая прямо сейчас; для неё ничего не показываем. */
  activeRoomId?: string;
  /** Вкладка на переднем плане: влияет на системные уведомления. */
  onNotice: (message: IncomingMessage) => void;
}

/**
 * Заметность входящих вне открытой комнаты: подписка на все комнаты
 * пользователя, тихая для своих сообщений и для активной комнаты.
 */
export function useIncomingMessages(adapter: RealtimeAdapter | null, options: Options): void {
  const live = useRef(options);
  live.current = options;

  useEffect(() => {
    if (!adapter) return;

    const subscriptions = [...options.rooms.keys()].map((roomId) =>
      adapter.subscribeRoom(roomId, (event) => {
        if (event.event !== 'message.created.v1') return;

        const current = live.current;
        const isOwn = event.data.author.id === current.currentUserId;
        const isActive = current.activeRoomId === roomId && document.visibilityState === 'visible';
        const isSystem = event.data.kind === 'system';

        if (isOwn || isActive || isSystem) return;

        current.onNotice({
          roomId,
          roomName: current.rooms.get(roomId) ?? 'Комната',
          authorName: event.data.author.name,
          body: event.data.body,
        });
      }),
    );

    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
    // Пересобираем подписки только при изменении набора комнат.
  }, [adapter, [...options.rooms.keys()].join(',')]);
}

/** Разрешение на системные уведомления запрашивается по явному действию. */
export function useNotificationPermission(): {
  permission: NotificationPermission | 'unsupported';
  request: () => Promise<void>;
} {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  return {
    permission,
    request: async () => {
      if (typeof Notification === 'undefined') return;
      const result = await Notification.requestPermission();
      setPermission(result);
    },
  };
}
