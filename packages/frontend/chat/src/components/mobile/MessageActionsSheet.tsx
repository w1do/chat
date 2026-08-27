import { RADIUS, Sheet, type ThemeTokens } from '@vendor/ui';
import { Copy, CornerUpLeft, Pencil, Trash2 } from 'lucide-react';
import type { Message } from '../../schemas/message';
import { EMOJI_GROUPS } from './EmojiPicker';

interface MessageActionsSheetProps {
  message: Message | null;
  authorName: string;
  own: boolean;
  theme: ThemeTokens;
  onClose: () => void;
  onReply: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  /** Правка своего текста; отсутствует — пункта в меню нет. */
  onEdit?: (message: Message) => void;
  onDelete: (message: Message) => void;
  onCopied: (ok: boolean) => void;
}

/** Быстрый ряд реакций — первые эмодзи из общей палитры. */
const QUICK_REACTIONS = EMOJI_GROUPS[0]!.emoji.slice(0, 6);

/**
 * Меню действий над сообщением. Открывается долгим нажатием на телефоне и
 * правым кликом на компьютере; отдельных кнопок в ленте нет.
 */
export function MessageActionsSheet({
  message,
  authorName,
  own,
  theme,
  onClose,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onCopied,
}: MessageActionsSheetProps) {
  const open = message !== null;

  const copy = async () => {
    if (message === null) return;

    try {
      await navigator.clipboard.writeText(message.body ?? '');
      onCopied(true);
    } catch {
      // Clipboard API недоступен в незащищённом контексте или запрещён.
      onCopied(false);
    }

    onClose();
  };

  return (
    <Sheet
      open={open}
      title="Сообщение"
      subtitle={open ? authorName : undefined}
      theme={theme}
      onClose={onClose}
    >
      {message !== null ? (
        <div className="px-4 pb-6">
          <div
            role="group"
            aria-label="Реакции"
            className="flex justify-between mb-4 px-1 py-2"
            style={{ background: theme.surfaceAlt, borderRadius: RADIUS.md }}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`Реакция ${emoji}`}
                onClick={() => {
                  onReact(message, emoji);
                  onClose();
                }}
                className="tap grid place-items-center"
                style={{ width: 44, height: 44, borderRadius: 22, fontSize: 24 }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <ul style={{ background: theme.surface, borderRadius: RADIUS.md, overflow: 'hidden' }}>
            <ActionRow
              theme={theme}
              icon={<CornerUpLeft size={18} />}
              label="Ответить"
              onClick={() => {
                onReply(message);
                onClose();
              }}
            />
            <ActionRow theme={theme} icon={<Copy size={18} />} label="Копировать текст" onClick={copy} />
            {/* Правят только свой текст — и только пока он есть: у сообщения
                из одних вложений править нечего. */}
            {own && onEdit && message.body ? (
              <ActionRow
                theme={theme}
                icon={<Pencil size={18} />}
                label="Редактировать"
                onClick={() => {
                  onEdit(message);
                  onClose();
                }}
              />
            ) : null}
            {own ? (
              <ActionRow
                theme={theme}
                icon={<Trash2 size={18} />}
                label="Удалить"
                danger
                last
                onClick={() => {
                  onDelete(message);
                  onClose();
                }}
              />
            ) : null}
          </ul>
        </div>
      ) : null}
    </Sheet>
  );
}

function ActionRow({
  theme,
  icon,
  label,
  onClick,
  danger = false,
  last = false,
}: {
  theme: ThemeTokens;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-left tap"
        style={{
          color: danger ? theme.danger : theme.text,
          borderBottom: last ? 'none' : `1px solid ${theme.hairline}`,
          fontSize: 16,
        }}
      >
        <span aria-hidden="true" className="grid place-items-center shrink-0" style={{ width: 22 }}>
          {icon}
        </span>
        {label}
      </button>
    </li>
  );
}
