import { Avatar, ONLINE, RADIUS, voiceHue, type ThemeTokens } from '@vendor/ui';
import type { Member } from '../schemas/room';

/** Сколько кандидатов показываем разом: список не должен закрывать переписку. */
export const MENTION_LIMIT = 5;

/** Ник или имя — то, что человек набирает после `@`. */
const mentionLabel = (member: Member): string => member.username ?? member.name ?? member.user_id;

/**
 * Кандидаты на упоминание: совпадение по началу ника или по любой части
 * имени. Порядок — сперва совпавшие ником, чтобы `@ол` находило `@olga`
 * раньше «Николая».
 */
export function filterMentionCandidates(members: Member[], filter: string, limit = MENTION_LIMIT): Member[] {
  const needle = filter.trim().toLowerCase();

  if (needle === '') return members.slice(0, limit);

  const byUsername: Member[] = [];
  const byName: Member[] = [];

  for (const member of members) {
    const username = (member.username ?? '').toLowerCase();
    const name = (member.name ?? '').toLowerCase();

    if (username.startsWith(needle)) byUsername.push(member);
    else if (name.includes(needle) || username.includes(needle)) byName.push(member);
  }

  return [...byUsername, ...byName].slice(0, limit);
}

interface MentionPickerProps {
  matches: Member[];
  filter: string;
  /** Кандидат под клавиатурой: стрелки двигают его, Enter/Tab подтверждает. */
  activeIndex: number;
  theme: ThemeTokens;
  onPick: (member: Member) => void;
  onActivate: (index: number) => void;
  /** Кто сейчас в комнате по presence-каналу. */
  presentUserIds?: string[];
}

/**
 * Выбор упоминания: плавающая карточка над строкой ввода. Каждая строка —
 * аватарка с личным оттенком голоса, статус присутствия, ник и имя.
 */
export function MentionPicker({
  matches,
  filter,
  activeIndex,
  theme,
  onPick,
  onActivate,
  presentUserIds = [],
}: MentionPickerProps) {
  if (matches.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Упомянуть участника"
      className="overflow-hidden blur-chrome"
      style={{
        background: theme.surface,
        borderRadius: RADIUS.md,
        boxShadow: '0 10px 30px rgba(20,19,26,.18)',
        border: `1px solid ${theme.hairline}`,
      }}
    >
      {matches.map((member, index) => {
        const label = mentionLabel(member);
        const active = index === activeIndex;
        const hue = voiceHue(member.user_id);
        const online = presentUserIds.includes(member.user_id) || member.is_online;

        return (
          <li key={member.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              // Имя для скринридера собирается целиком: подсветка совпадения
              // рвёт текст на куски и читалась бы по слогам.
              aria-label={`@${label} · ${member.name ?? label}${online ? ' · в сети' : ''}`}
              // Панель ввода не должна терять фокус до вставки ника.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onActivate(index)}
              onClick={() => onPick(member)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left tap"
              style={{
                background: active ? `${hue}14` : 'transparent',
                boxShadow: active ? `inset 3px 0 0 ${hue}` : 'none',
                borderBottom: index === matches.length - 1 ? 'none' : `1px solid ${theme.hairline}`,
              }}
            >
              <span
                className="grid place-items-center shrink-0 rounded-full"
                // Кольцо вокруг аватарки — тот же личный оттенок, ярче в фокусе.
                style={{ padding: 2, boxShadow: `0 0 0 2px ${active ? hue : `${hue}33`}`, borderRadius: 999 }}
              >
                <Avatar
                  userId={member.user_id}
                  name={member.name ?? label}
                  src={member.avatar_url}
                  size={28}
                  theme={theme}
                  online={online}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold truncate" style={{ color: theme.text }}>
                  @{highlight(label, filter)}
                </span>
                <span className="block text-[12.5px] truncate" style={{ color: online ? ONLINE : theme.muted }}>
                  {member.name ?? label}
                  {online ? ' · в сети' : ''}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Совпавшая часть ника выделяется — видно, почему участник в списке. */
function highlight(label: string, filter: string) {
  const needle = filter.trim().toLowerCase();
  const at = needle === '' ? -1 : label.toLowerCase().indexOf(needle);

  if (at < 0) return label;

  return (
    <>
      {label.slice(0, at)}
      <mark style={{ background: 'transparent', color: 'inherit', textDecoration: 'underline' }}>
        {label.slice(at, at + needle.length)}
      </mark>
      {label.slice(at + needle.length)}
    </>
  );
}
