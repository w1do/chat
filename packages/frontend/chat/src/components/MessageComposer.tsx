import { useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Member } from '../schemas/room';
import type { Message, SendMessageInput } from '../schemas/message';
import { MentionPicker } from './MentionPicker';
import { ReplyPreview } from './ReplyPreview';

interface MessageComposerProps {
  onSend: (input: SendMessageInput) => Promise<unknown>;
  members?: Member[];
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editing?: Message | null;
  onSubmitEdit?: (messageId: string, body: string) => Promise<unknown>;
  onCancelEdit?: () => void;
}

/** Композер: отправка/редактирование, ответы, упоминания через @. */
export function MessageComposer({
  onSend,
  members = [],
  replyTo,
  onCancelReply,
  editing,
  onSubmitEdit,
  onCancelEdit,
}: MessageComposerProps) {
  const [body, setBody] = useState(editing?.body ?? '');
  const [mentions, setMentions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mentionMatch = /@([\p{L}\w-]*)$/u.exec(body);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setError(null);
    try {
      if (editing && onSubmitEdit) {
        await onSubmitEdit(editing.id, trimmed);
        onCancelEdit?.();
      } else {
        await onSend({
          body: trimmed,
          reply_to_id: replyTo?.id ?? null,
          mentions: mentions.length > 0 ? mentions : undefined,
        });
        onCancelReply?.();
      }
      setBody('');
      setMentions([]);
    } catch {
      // Текст не теряется: остаётся в поле для повторной отправки.
      setError(editing ? 'Не удалось сохранить изменения.' : 'Не удалось отправить сообщение.');
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} aria-label={editing ? 'edit-message' : 'send-message'}>
      {error ? <p role="alert">{error}</p> : null}
      {replyTo && !editing ? <ReplyPreview replyTo={replyTo} onCancel={() => onCancelReply?.()} /> : null}

      <label htmlFor="composer-body">{editing ? 'Изменить сообщение' : 'Сообщение'}</label>
      <textarea
        id="composer-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
      />

      {mentionMatch ? (
        <MentionPicker
          members={members}
          filter={mentionMatch[1] ?? ''}
          onPick={(member) => {
            setBody(body.replace(/@[\p{L}\w-]*$/u, `@${member.name ?? member.user_id} `));
            setMentions((current) =>
              current.includes(member.user_id) ? current : [...current, member.user_id],
            );
          }}
        />
      ) : null}

      <button type="submit">{editing ? 'Сохранить' : 'Отправить'}</button>
      {editing ? (
        <button type="button" onClick={() => onCancelEdit?.()}>
          Отмена
        </button>
      ) : null}
    </form>
  );
}
