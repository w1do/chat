import type { PresenceMember } from '../adapters/RealtimeAdapter';

interface PresenceDotsProps {
  members: PresenceMember[];
  max?: number;
}

/** Кто сейчас в комнате (presence-канал). */
export function PresenceDots({ members, max = 5 }: PresenceDotsProps) {
  if (members.length === 0) return null;

  return (
    <ul aria-label={`Сейчас в комнате: ${members.length}`}>
      {members.slice(0, max).map((member) => (
        <li key={member.id} title={member.name}>
          <span aria-hidden="true">●</span> {member.name}
        </li>
      ))}
      {members.length > max ? <li>ещё {members.length - max}</li> : null}
    </ul>
  );
}
