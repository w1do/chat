import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { useEffect, useState } from 'react';
import { useDirectCandidates } from '../../hooks/useRooms';
import { cleanNickname, MIN_NICKNAME_LENGTH } from './InvitePanel';

interface StartConversationPanelProps {
  theme: ThemeTokens;
  /** Начало переписки по идентификатору выбранного человека. */
  onStart: (userId: string) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Начало личной переписки: тот же поиск по нику, что и приглашение в комнату.
 * Человек вводит `@ник`, видит найденных и открывает диалог нажатием; повтор
 * открывает прежнюю переписку.
 */
export function StartConversationPanel({ theme, onStart, onCancel }: StartConversationPanelProps) {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Поиск не гонится за каждой буквой: частота у него та же, что у приглашений.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(input), 250);

    return () => clearTimeout(timer);
  }, [input]);

  const nickname = cleanNickname(term);
  const searching = nickname.length >= MIN_NICKNAME_LENGTH;
  const candidates = useDirectCandidates(term);
  const found = searching ? (candidates.data ?? []) : [];
  const nobody = searching && !candidates.isPending && !candidates.error && found.length === 0;

  const start = async (userId: string) => {
    setError(null);
    setBusyId(userId);
    try {
      await onStart(userId);
    } catch {
      setError('Не удалось начать переписку.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-label="start-conversation" className="mt-3">
      <div className="p-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <label htmlFor="conversation-nickname" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
          Ник собеседника
        </label>
        <input
          id="conversation-nickname"
          value={input}
          placeholder="@ник"
          autoComplete="off"
          onChange={(event) => {
            setInput(event.target.value);
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
                  disabled={busyId === candidate.id}
                  onClick={() => void start(candidate.id)}
                  className="w-full flex items-center gap-3 px-1 py-2 text-left tap"
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
                    Написать
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {nobody ? (
          <p className="mt-2 text-[13px]" style={{ color: theme.muted }}>
            Никого не нашли: переписку можно начать только с человеком этой установки.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 text-[13px]" style={{ color: theme.danger }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full py-2.5 tap text-[15px]"
          style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: RADIUS.sm }}
        >
          Отмена
        </button>
      </div>
    </section>
  );
}
