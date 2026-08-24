import type { Message } from '../schemas/message';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  error?: unknown;
  currentUserId: string;
  canModerate: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

/** История комнаты: новые внизу, подгрузка старых по кнопке (cursor). */
export function MessageList({
  messages,
  isLoading,
  error,
  currentUserId,
  canModerate,
  hasMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}: MessageListProps) {
  if (isLoading) return <p aria-busy="true">Загрузка сообщений…</p>;
  if (error) return <p role="alert">Не удалось загрузить сообщения.</p>;
  if (!messages || messages.length === 0) return <p role="status">Пока нет сообщений — напишите первое.</p>;

  const byId = new Map(messages.map((message) => [message.id, message]));
  const ordered = [...messages].reverse(); // API отдаёт новые → старые

  return (
    <div aria-label="История сообщений">
      {hasMore ? (
        <button type="button" onClick={onLoadMore}>
          Показать более ранние
        </button>
      ) : null}
      <ol>
        {ordered.map((message) => (
          <li key={message.id}>
            <MessageItem
              message={message}
              isOwn={message.author_id === currentUserId}
              canModerate={canModerate}
              replyTarget={message.reply_to_id ? (byId.get(message.reply_to_id) ?? null) : null}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleReaction={onToggleReaction}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
