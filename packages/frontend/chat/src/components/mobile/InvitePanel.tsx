import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { useEffect, useState } from 'react';
import { useMemberCandidates } from '../../hooks/useRooms';

/** Ник вводят и с собакой, и без: для поиска она ничего не значит. */
export function cleanNickname(input: string): string {
  return input.trim().replace(/^@+/, '');
}

export const MIN_NICKNAME_LENGTH = 2;

interface InvitePanelProps {
  roomId: string;
  theme: ThemeTokens;
  /** Приглашение по идентификатору: его интерфейс берёт из результата поиска. */
  onInvite: (userId: string) => Promise<unknown>;
  /** Запасной путь, когда человека в установке ещё нет. */
  onInviteByLink?: () => void;
}

/**
 * Приглашение по нику: человек вводит `@ник`, видит найденных с именами и
 * добавляет нужного нажатием. Внутренний идентификатор пользователя нигде не
 * показывается и вводить его не нужно.
 */
export function InvitePanel({ roomId, theme, onInvite, onInviteByLink }: InvitePanelProps) {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitedId, setInvitedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Поиск не гонится за каждой буквой: частота у него та же, что у приглашений.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(input), 250);

    return () => clearTimeout(timer);
  }, [input]);

  const nickname = cleanNickname(term);
  const searching = nickname.length >= MIN_NICKNAME_LENGTH;
  const candidates = useMemberCandidates(roomId, term);
  const found = searching ? (candidates.data ?? []) : [];
  const nobody = searching && !candidates.isPending && !candidates.error && found.length === 0;

  const invite = async (userId: string) => {
    setError(null);
    setBusyId(userId);
    try {
      await onInvite(userId);
      setInvitedId(userId);
    } catch {
      setError('Не удалось пригласить человека.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-label="invite" className="px-3 mb-5">
      <div className="p-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <label htmlFor="invite-nickname" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
          Ник человека
        </label>
        <input
          id="invite-nickname"
          value={input}
          placeholder="@ник"
          autoComplete="off"
          onChange={(event) => {
            setInput(event.target.value);
            setInvitedId(null);
            setError(null);
          }}
          className="w-full px-3 py-2 outline-none field-focus"
          style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
        />

        {!searching ? (
          <p className="mt-2 text-[13px]" style={{ color: theme.muted }}>
            Введите хотя бы два символа ника.
          </p>
        ) : null}

        {searching && candidates.isPending ? (
          <p aria-busy="true" className="mt-2 text-[13px]" style={{ color: theme.muted }}>
            Ищем…
          </p>
        ) : null}

        {candidates.error ? (
          <p role="alert" className="mt-2 text-[13px]" style={{ color: theme.danger }}>
            Не удалось выполнить поиск.
          </p>
        ) : null}

        {found.length > 0 ? (
          <ul className="mt-2 flex flex-col">
            {found.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  disabled={candidate.already_member || busyId === candidate.id}
                  onClick={() => invite(candidate.id)}
                  className="w-full flex items-center gap-3 px-1 py-2 text-left tap"
                  style={{ opacity: candidate.already_member ? 0.55 : 1 }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] truncate" style={{ color: theme.text }}>
                      {candidate.name}
                    </span>
                    <span className="block text-[13px] truncate" style={{ color: theme.muted }}>
                      @{candidate.username}
                    </span>
                  </span>
                  <span className="text-[13px] shrink-0" style={{ color: theme.muted }}>
                    {candidate.already_member
                      ? 'уже в комнате'
                      : invitedId === candidate.id
                        ? 'приглашён'
                        : 'Пригласить'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {nobody ? (
          <div className="mt-2">
            <p className="text-[13px]" style={{ color: theme.muted }}>
              Никого не нашли. Если человека здесь ещё нет — позовите его ссылкой.
            </p>
            {onInviteByLink ? (
              <button
                type="button"
                onClick={onInviteByLink}
                className="mt-2 w-full py-2.5 tap text-[15px] font-medium"
                style={{ background: theme.surfaceAlt, color: theme.text, borderRadius: RADIUS.sm }}
              >
                Пригласить ссылкой
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 text-[13px]" style={{ color: theme.danger }}>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
