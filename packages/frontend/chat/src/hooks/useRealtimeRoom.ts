import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ConnectionState, PresenceMember, RealtimeAdapter } from '../adapters/RealtimeAdapter';
import { applyRoomEvent, forgetRoom, resyncRoom } from '../realtime/handlers';

/**
 * Подписка на события комнаты + presence. После reconnect выполняется
 * HTTP-ресинхронизация — пропущенные события не теряются.
 */
export interface JoinGreeting {
  userId: string;
  name: string;
  at: number;
}

export function useRealtimeRoom(
  adapter: RealtimeAdapter | null,
  roomId: string,
  options: { enabled?: boolean; currentUserId?: string } = {},
) {
  const enabled = options.enabled ?? true;
  const currentUserId = options.currentUserId ?? '';
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<ConnectionState>('connected');
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presentMembers, setPresentMembers] = useState<PresenceMember[]>([]);
  /** Кто только что присоединился — повод поздравить всю комнату. */
  const [joinGreeting, setJoinGreeting] = useState<JoinGreeting | null>(null);
  /** Комнату удалили, пока она была открыта: читать больше нечего. */
  const [deleted, setDeleted] = useState(false);
  /** Человека исключили из комнаты, пока она была открыта. */
  const [removed, setRemoved] = useState(false);
  const wasDisconnected = useRef(false);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    // Приватные каналы авторизуются сервером по членству: подписываемся только
    // когда пользователь уже участник, и переподписываемся при его изменении.
    if (!adapter || !enabled) return;

    setDeleted(false);
    setRemoved(false);

    const room = adapter.subscribeRoom(roomId, (event) => {
      // Исключили меня: комната закрывается так же, как удалённая, — и её
      // кэш убирается до инвалидации, чтобы не спрашивать чужую комнату.
      if (
        event.event === 'room.member_changed.v1' &&
        event.data.action === 'removed' &&
        event.data.user_id === currentUserId
      ) {
        forgetRoom(queryClient, roomId);
        setRemoved(true);
        return;
      }

      applyRoomEvent(queryClient, event);

      if (event.event === 'room.deleted.v1') {
        setDeleted(true);
        return;
      }

      if (event.event === 'message.created.v1' && event.data.payload?.event === 'member.joined') {
        setJoinGreeting({
          userId: event.data.payload.actor_id,
          name: event.data.author.name,
          at: Date.now(),
        });
      }
    });

    const presence = adapter.subscribePresence(roomId, {
      onHere: (members) => setPresentMembers(members),
      onJoining: (member) =>
        setPresentMembers((current) =>
          current.some((m) => m.id === member.id) ? current : [...current, member],
        ),
      onLeaving: (member) => setPresentMembers((current) => current.filter((m) => m.id !== member.id)),
      onEvent: (event) => {
        if (event.event !== 'typing.changed.v1') return;
        const { user_id: userId, is_typing: isTyping } = event.data;

        const timers = typingTimers.current;
        const existing = timers.get(userId);
        if (existing) clearTimeout(existing);

        if (isTyping) {
          setTypingUserIds((current) => (current.includes(userId) ? current : [...current, userId]));
          // Страховочный таймаут на случай потери события "перестал печатать".
          timers.set(
            userId,
            setTimeout(() => setTypingUserIds((current) => current.filter((id) => id !== userId)), 7000),
          );
        } else {
          timers.delete(userId);
          setTypingUserIds((current) => current.filter((id) => id !== userId));
        }
      },
    });

    const offConnection = adapter.onConnectionChange((state) => {
      setConnection(state);
      if (state !== 'connected') {
        wasDisconnected.current = true;
        return;
      }
      if (wasDisconnected.current) {
        wasDisconnected.current = false;
        resyncRoom(queryClient, roomId);
      }
    });

    return () => {
      room.unsubscribe();
      presence.unsubscribe();
      offConnection();
      typingTimers.current.forEach((timer) => clearTimeout(timer));
      typingTimers.current.clear();
    };
  }, [adapter, roomId, enabled, currentUserId, queryClient]);

  return {
    connection,
    typingUserIds,
    presentMembers,
    joinGreeting,
    deleted,
    removed,
    dismissGreeting: () => setJoinGreeting(null),
  };
}
