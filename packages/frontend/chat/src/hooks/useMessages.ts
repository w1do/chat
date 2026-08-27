import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { messagesApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import type { Message, MessagePage, SendMessageInput } from '../schemas/message';

const messagesKey = (roomId: string) => ['chat', 'messages', roomId] as const;
type MessagesData = InfiniteData<MessagePage, string | null>;

export function useMessages(roomId: string) {
  const client = useChatClient();

  return useInfiniteQuery({
    queryKey: messagesKey(roomId),
    queryFn: ({ pageParam }) => messagesApi.list(client, roomId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor,
  });
}

/** Отправка с optimistic update и rollback при ошибке (+ ключ идемпотентности). */
export function useSendMessage(roomId: string, authorId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => messagesApi.send(client, roomId, input, idempotencyKey()),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: messagesKey(roomId) });
      const previous = queryClient.getQueryData<MessagesData>(messagesKey(roomId));

      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: optimisticId,
        room_id: roomId,
        kind: 'text',
        author_id: authorId,
        author_name: null,
        // Лента берёт аватарку из состава комнаты, а не из сообщения:
        // здесь она не нужна и не создаёт мигания.
        author_avatar_url: null,
        reply_to_id: input.reply_to_id ?? null,
        body: input.body ?? '',
        mentions: input.mentions ?? [],
        is_edited: false,
        edited_at: null,
        deleted: false,
        created_at: new Date().toISOString(),
        reactions: [],
        payload: null,
        // Плитки появятся с ответом сервера: локальная запись живёт мгновение.
        attachments: [],
      };

      queryClient.setQueryData<MessagesData>(messagesKey(roomId), (data) => {
        if (!data) return data;
        const [first, ...rest] = data.pages;
        if (!first) return data;
        return { ...data, pages: [{ ...first, data: [optimistic, ...first.data] }, ...rest] };
      });

      return { previous, optimisticId };
    },
    onSuccess: (message, _input, context) => {
      // Заменяем оптимистичную запись серверной: иначе real-time событие
      // добавит второе сообщение с тем же текстом.
      queryClient.setQueryData<MessagesData>(messagesKey(roomId), (data) => {
        if (!data) return data;
        let replaced = false;
        const pages = data.pages.map((page) => ({
          ...page,
          data: page.data.flatMap((item) => {
            if (item.id === context?.optimisticId) {
              replaced = true;

              return page.data.some((m) => m.id === message.id) ? [] : [message];
            }

            return item.id === message.id && replaced ? [] : [item];
          }),
        }));

        return { ...data, pages };
      });
    },
    onError: (_error, _input, context) => {
      // Rollback: ошибка отправки не оставляет фантомное сообщение.
      if (context?.previous) queryClient.setQueryData(messagesKey(roomId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey(roomId) }),
  });
}

export function useEditMessage(roomId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      messagesApi.edit(client, messageId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey(roomId) }),
  });
}

export function useDeleteMessage(roomId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messagesApi.remove(client, messageId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey(roomId) }),
  });
}

/** Реакции: optimistic-переключение счётчика с откатом. */
export function useReactions(roomId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.toggleReaction(client, messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey(roomId) });
      const previous = queryClient.getQueryData<MessagesData>(messagesKey(roomId));

      queryClient.setQueryData<MessagesData>(messagesKey(roomId), (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((message) => {
              if (message.id !== messageId) return message;
              const existing = message.reactions.find((r) => r.emoji === emoji);
              const reactions = existing
                ? message.reactions
                    .map((r) =>
                      r.emoji === emoji
                        ? { ...r, count: r.count + (r.reacted_by_me ? -1 : 1), reacted_by_me: !r.reacted_by_me }
                        : r,
                    )
                    .filter((r) => r.count > 0)
                : [...message.reactions, { emoji, count: 1, reacted_by_me: true }];
              return { ...message, reactions };
            }),
          })),
        };
      });

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey(roomId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey(roomId) }),
  });
}

/**
 * Ключ идемпотентности отправки. `crypto.randomUUID` доступен только в
 * secure context (https/localhost), поэтому нужен фолбэк.
 */
function idempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID;
  if (typeof uuid === 'function') return globalThis.crypto.randomUUID();

  const random = Math.random().toString(36).slice(2);

  return `send-${Date.now().toString(36)}-${random}`;
}
