import type { Message } from '../schemas/message';
import { ReactionBar } from './ReactionBar';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  canModerate: boolean;
  replyTarget?: Message | null;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

/**
 * Одно сообщение истории. Тело всегда рендерится как текст (React экранирует),
 * небезопасный HTML не внедряется.
 */
export function MessageItem({
  message,
  isOwn,
  canModerate,
  replyTarget,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
}: MessageItemProps) {
  if (message.deleted) {
    return (
      <article aria-label={`Сообщение ${message.id}`}>
        <p role="note">Сообщение удалено</p>
      </article>
    );
  }

  return (
    <article aria-label={`Сообщение ${message.id}`}>
      <header>
        <strong>{message.author_name ?? message.author_id}</strong>{' '}
        <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString()}</time>
        {message.edited_at ? <em> (изменено)</em> : null}
      </header>

      {replyTarget ? (
        <blockquote>
          Ответ {replyTarget.author_name ?? replyTarget.author_id}: {replyTarget.deleted ? '…' : replyTarget.body}
        </blockquote>
      ) : null}

      <p>{message.body}</p>

      <ReactionBar reactions={message.reactions} onToggle={(emoji) => onToggleReaction(message.id, emoji)} />

      <footer>
        <button type="button" onClick={() => onReply(message)}>
          Ответить
        </button>
        {isOwn ? (
          <button type="button" onClick={() => onEdit(message)}>
            Редактировать
          </button>
        ) : null}
        {isOwn || canModerate ? (
          <button type="button" onClick={() => onDelete(message.id)}>
            Удалить
          </button>
        ) : null}
      </footer>
    </article>
  );
}
