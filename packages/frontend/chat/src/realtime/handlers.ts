// Применение real-time событий к кэшу TanStack Query.

import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Message, MessagePage } from '../schemas/message';
import type { RoomEvent } from './eventMap';

const messagesKey = (roomId: string) => ['chat', 'messages', roomId] as const;
type MessagesData = InfiniteData<MessagePage, string | null>;

export function applyRoomEvent(queryClient: QueryClient, event: RoomEvent): void {
  switch (event.event) {
    case 'message.created.v1': {
      const message: Message = {
        id: event.data.id,
        room_id: event.room_id,
        author_id: event.data.author.id,
        author_name: event.data.author.name,
        reply_to_id: event.data.reply_to_id,
        body: event.data.body,
        mentions: [],
        edited_at: null,
        deleted: false,
        created_at: event.data.created_at,
        reactions: [],
      };

      queryClient.setQueryData<MessagesData>(messagesKey(event.room_id), (data) => {
        if (!data) return data;
        const [first, ...rest] = data.pages;
        if (!first) return data;
        if (data.pages.some((page) => page.data.some((m) => m.id === message.id))) return data;
        return { ...data, pages: [{ ...first, data: [message, ...first.data] }, ...rest] };
      });
      break;
    }

    case 'message.updated.v1':
      patchMessage(queryClient, event.room_id, event.data.id, {
        body: event.data.body,
        edited_at: event.data.edited_at,
      });
      break;

    case 'message.deleted.v1':
      patchMessage(queryClient, event.room_id, event.data.id, {
        deleted: true,
        body: null,
        mentions: [],
      });
      break;

    case 'reaction.changed.v1':
      // Счётчик события относится к одному emoji; чтобы не разъезжаться с
      // reacted_by_me других пользователей — точечная инвалидация.
      void queryClient.invalidateQueries({ queryKey: messagesKey(event.room_id) });
      break;

    case 'room.member_changed.v1':
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms', event.room_id, 'members'] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      break;
  }
}

function patchMessage(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  patch: Partial<Message>,
): void {
  queryClient.setQueryData<MessagesData>(messagesKey(roomId), (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
      })),
    };
  });
}

/** HTTP-ресинхронизация после reconnect: WebSocket — не источник истины. */
export function resyncRoom(queryClient: QueryClient, roomId: string): void {
  void queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
  void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms', roomId] });
  void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms', roomId, 'members'] });
}
