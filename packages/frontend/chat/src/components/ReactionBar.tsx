import type { Reaction } from '../schemas/message';

interface ReactionBarProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  quickEmojis?: string[];
}

/** Реакции сообщения: текущие счётчики + быстрые кнопки. */
export function ReactionBar({ reactions, onToggle, quickEmojis = ['👍', '❤️', '😂'] }: ReactionBarProps) {
  const shown = new Set(reactions.map((reaction) => reaction.emoji));

  return (
    <div role="group" aria-label="Реакции">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-pressed={reaction.reacted_by_me}
          onClick={() => onToggle(reaction.emoji)}
        >
          {reaction.emoji} {reaction.count}
        </button>
      ))}
      {quickEmojis
        .filter((emoji) => !shown.has(emoji))
        .map((emoji) => (
          <button key={emoji} type="button" aria-pressed={false} onClick={() => onToggle(emoji)}>
            {emoji}
          </button>
        ))}
    </div>
  );
}
