import { ONLINE, type ThemeTokens } from '@vendor/ui';
import { formatLastSeen } from '../format';

interface PresenceBadgeProps {
  online: boolean;
  lastSeenAt: string | null;
  theme: ThemeTokens;
  /** Подпись в шапке крупнее, чем в списке участников. */
  fontSize?: number;
}

/**
 * Присутствие человека одной строкой: зелёная точка и «В сети» либо серая
 * точка и «был(а) в сети …». Точка — украшение, статус несёт текст.
 */
export function PresenceBadge({ online, lastSeenAt, theme, fontSize = 13 }: PresenceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0" style={{ fontSize }}>
      <span
        aria-hidden="true"
        className="shrink-0"
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          background: online ? ONLINE : theme.faint,
        }}
      />
      <span className="truncate" style={{ color: online ? ONLINE : theme.muted }}>
        {formatLastSeen(lastSeenAt, { online })}
      </span>
    </span>
  );
}
