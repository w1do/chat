import { RADIUS, overlayOnOwn, voiceHue, type ThemeTokens } from '@vendor/ui';
import { Check, CheckCheck, CornerUpLeft } from 'lucide-react';
import { useState } from 'react';
import { formatTime } from '../../format';
import { useMessageGestures, SWIPE_THRESHOLD_PX } from '../../hooks/useMessageGestures';
import type { Message } from '../../schemas/message';

interface MessageBubbleProps {
  message: Message;
  /** Оригинал, на который отвечает это сообщение (если загружен). */
  reply: Message | null;
  replyAuthor: string;
  own: boolean;
  first: boolean;
  last: boolean;
  theme: ThemeTokens;
  fontSize: number;
  highlighted: boolean;
  onReply: (message: Message) => void;
  onQuickReaction: (message: Message) => void;
  onOpenActions: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onJump: (messageId: string) => void;
}

/** Быстрая реакция двойным касанием — одна и та же во всём приложении. */
export const QUICK_REACTION = '❤️';

/**
 * Пузырь сообщения. Действия живут на жестах (свайп влево — ответ, двойное
 * касание — быстрая реакция, долгое нажатие или правый клик — меню), поэтому
 * в ленте нет постоянных кнопок.
 */
export function MessageBubble({
  message,
  reply,
  replyAuthor,
  own,
  first,
  last,
  theme,
  fontSize,
  highlighted,
  onReply,
  onQuickReaction,
  onOpenActions,
  onToggleReaction,
  onJump,
}: MessageBubbleProps) {
  const reactionCount = message.reactions.reduce((sum, reaction) => sum + reaction.count, 0);
  const deleted = message.deleted;

  // Смещение во время свайпа хранится локально: перерисовывается только этот
  // пузырь, а не вся лента.
  const [offset, setOffset] = useState(0);

  const gestures = useMessageGestures({
    disabled: deleted,
    onReply: () => onReply(message),
    onQuickReaction: () => onQuickReaction(message),
    onOpenActions: () => onOpenActions(message),
    onSwipeProgress: setOffset,
  });

  return (
    <div className="relative" style={{ alignSelf: own ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
      {offset < -8 ? (
        <span
          aria-hidden="true"
          className="absolute grid place-items-center"
          style={{
            right: -28,
            top: '50%',
            transform: 'translateY(-50%)',
            color: offset <= -SWIPE_THRESHOLD_PX ? theme.amberText : theme.faint,
            transition: 'color .15s ease',
          }}
        >
          <CornerUpLeft size={16} />
        </span>
      ) : null}

      <article
        data-message-id={message.id}
        aria-label={`Сообщение ${message.id}`}
        tabIndex={deleted ? -1 : 0}
        {...gestures}
        onKeyDown={(event) => {
          if (deleted) return;

          // Меню действий доступно без жестов: клавиатура и скринридер.
          if (event.key === 'ContextMenu' || event.key === 'Enter' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            onOpenActions(message);
          }
        }}
        className={`relative px-3.5 py-2 ${first ? (own ? 'enter-right' : 'enter-left') : ''}`}
        style={{
          background: own ? theme.own : theme.surface,
          color: own ? theme.ownText : theme.text,
          borderRadius: RADIUS.bubble,
          borderTopLeftRadius: !own && first ? 8 : RADIUS.bubble,
          borderTopRightRadius: own && first ? 8 : RADIUS.bubble,
          marginBottom: reactionCount > 0 ? 12 : 0,
          opacity: deleted ? 0.6 : 1,
          boxShadow: highlighted ? `0 0 0 2px ${theme.amber}` : 'none',
          transform: offset < 0 ? `translateX(${offset}px)` : undefined,
          transition: offset === 0 ? 'transform .2s ease, box-shadow .4s ease' : 'box-shadow .4s ease',
          touchAction: 'pan-y',
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        {message.reply_to_id ? (
          <button
            type="button"
            onClick={() => onJump(message.reply_to_id!)}
            aria-label={`Перейти к сообщению ${message.reply_to_id}`}
            className="w-full text-left text-[12.5px] mb-1 px-2 py-1 tap flex gap-2"
            style={{
              background: own ? overlayOnOwn(theme) : theme.surfaceAlt,
              borderRadius: 8,
              color: own ? theme.ownText : theme.muted,
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0"
              style={{
                width: 2,
                borderRadius: 2,
                background: reply ? voiceHue(reply.author_id) : theme.faint,
              }}
            />
            <span className="min-w-0">
              <span className="block font-semibold truncate">{reply ? replyAuthor : 'Сообщение'}</span>
              <span className="block truncate">
                {reply === null
                  ? 'Сообщение не загружено'
                  : reply.deleted
                    ? 'Сообщение удалено'
                    : reply.body}
              </span>
            </span>
          </button>
        ) : null}

        <p
          style={{
            fontSize,
            lineHeight: 1.42,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontStyle: deleted ? 'italic' : 'normal',
          }}
        >
          {deleted ? 'Сообщение удалено' : message.body}
        </p>

        {last && !deleted ? (
          <span
            className="flex items-center gap-1 justify-end mt-0.5 text-[11px] tnum"
            style={{ color: own ? `${theme.ownText}99` : theme.faint }}
          >
            {message.edited_at ? <em>изменено</em> : null}
            {formatTime(message.created_at)}
            {own ? (
              message.id.startsWith('optimistic-') ? (
                <Check size={13} aria-label="отправляется" />
              ) : (
                <CheckCheck size={13} aria-label="отправлено" />
              )
            ) : null}
          </span>
        ) : null}

        {reactionCount > 0 ? (
          <button
            type="button"
            onClick={() => onToggleReaction(message.id, message.reactions[0]!.emoji)}
            aria-label={`Реакции: ${reactionCount}`}
            className="absolute pop grid place-items-center tap"
            style={{
              bottom: -11,
              [own ? 'left' : 'right']: 10,
              padding: '1px 6px',
              background: theme.surface,
              borderRadius: 11,
              fontSize: 12,
              color: theme.text,
              boxShadow: '0 2px 8px rgba(20,19,26,.16)',
            }}
          >
            {message.reactions.map((reaction) => reaction.emoji).join(' ')} {reactionCount}
          </button>
        ) : null}
      </article>
    </div>
  );
}
