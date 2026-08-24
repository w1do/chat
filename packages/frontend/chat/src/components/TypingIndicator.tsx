interface TypingIndicatorProps {
  typingUserIds: string[];
  namesById?: Map<string, string>;
  currentUserId?: string;
}

export function TypingIndicator({ typingUserIds, namesById, currentUserId }: TypingIndicatorProps) {
  const others = typingUserIds.filter((id) => id !== currentUserId);
  if (others.length === 0) return null;

  const names = others.map((id) => namesById?.get(id) ?? 'Кто-то');
  const label =
    others.length === 1 ? `${names[0]} печатает…` : `${names.slice(0, 2).join(', ')} печатают…`;

  return (
    <p role="status" aria-live="polite">
      {label}
    </p>
  );
}
