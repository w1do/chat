import { ONLINE, type ThemeTokens } from '@vendor/ui';
import type { PresenceMember } from '../adapters/RealtimeAdapter';

interface PresenceDotsProps {
  members: PresenceMember[];
  max?: number;
  theme?: ThemeTokens;
}

/** Кто сейчас в комнате (presence-канал): зелёная точка и имя. */
export function PresenceDots({ members, max = 5, theme }: PresenceDotsProps) {
  if (members.length === 0) return null;

  return (
    <ul aria-label={`Сейчас в комнате: ${members.length}`} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {members.slice(0, max).map((member) => (
        <li
          key={member.id}
          title={`${member.name} — в сети`}
          className="inline-flex items-center gap-1.5 text-[12.5px] truncate"
          style={{ color: theme?.muted }}
        >
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{ width: 7, height: 7, borderRadius: 4, background: ONLINE }}
          />
          {member.name}
        </li>
      ))}
      {members.length > max ? (
        <li className="text-[12.5px]" style={{ color: theme?.muted }}>
          ещё {members.length - max}
        </li>
      ) : null}
    </ul>
  );
}
