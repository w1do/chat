import type { Message } from '../schemas/message';

interface ReplyPreviewProps {
  replyTo: Message;
  onCancel: () => void;
}

export function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
  return (
    <div role="status" aria-label="Ответ на сообщение">
      Ответ {replyTo.author_name ?? replyTo.author_id}: {replyTo.body}
      <button type="button" aria-label="Отменить ответ" onClick={onCancel}>
        ✕
      </button>
    </div>
  );
}
