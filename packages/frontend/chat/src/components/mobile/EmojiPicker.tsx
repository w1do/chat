import { RADIUS, type ThemeTokens } from '@vendor/ui';

/** Небольшой набор без внешних зависимостей: реакции и вставка в текст. */
export const EMOJI_GROUPS: ReadonlyArray<{ label: string; emoji: readonly string[] }> = [
  { label: 'Часто', emoji: ['👍', '❤️', '😂', '🔥', '🎉', '👏', '🙏', '😮'] },
  { label: 'Лица', emoji: ['🙂', '😉', '😊', '😍', '🤔', '😅', '😢', '😴'] },
  { label: 'Жесты', emoji: ['👌', '✌️', '🤝', '💪', '🙌', '👋', '🫶', '🤞'] },
  { label: 'Прочее', emoji: ['✅', '❗', '⭐', '💡', '🍕', '☕', '🚀', '🌿'] },
];

interface EmojiPickerProps {
  theme: ThemeTokens;
  label: string;
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ theme, label, onPick }: EmojiPickerProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="p-2"
      style={{ background: theme.surface, borderRadius: RADIUS.md, boxShadow: '0 6px 24px rgba(20,19,26,.18)' }}
    >
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-1.5 last:mb-0">
          <p className="text-[11px] uppercase px-1 mb-1" style={{ color: theme.faint, letterSpacing: '0.07em' }}>
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1">
            {group.emoji.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={emoji}
                onClick={() => onPick(emoji)}
                className="tap grid place-items-center"
                style={{ width: 34, height: 34, borderRadius: 10, background: theme.surfaceAlt, fontSize: 18 }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
