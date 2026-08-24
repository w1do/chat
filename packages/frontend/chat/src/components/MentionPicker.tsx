import type { Member } from '../schemas/room';

interface MentionPickerProps {
  members: Member[];
  filter: string;
  onPick: (member: Member) => void;
}

/** Выбор упоминания: список участников, отфильтрованный по вводу после @. */
export function MentionPicker({ members, filter, onPick }: MentionPickerProps) {
  const matches = members.filter((member) =>
    (member.name ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  if (matches.length === 0) return null;

  return (
    <ul role="listbox" aria-label="Упомянуть участника">
      {matches.slice(0, 5).map((member) => (
        <li key={member.id}>
          <button type="button" role="option" aria-selected="false" onClick={() => onPick(member)}>
            {member.name ?? member.user_id}
          </button>
        </li>
      ))}
    </ul>
  );
}
