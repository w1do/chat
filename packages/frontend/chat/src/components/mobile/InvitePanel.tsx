import { RADIUS, Sheet, type ThemeTokens } from '@vendor/ui';
import { useEffect, useState } from 'react';
import { useMemberCandidates } from '../../hooks/useRooms';

/** Ник вводят и с собакой, и без: для поиска она ничего не значит. */
export function cleanNickname(input: string): string {
  return input.trim().replace(/^@+/, '');
}

export const MIN_NICKNAME_LENGTH = 2;

/** Наименьший тач-таргет: 44×44pt по WCAG 2.2 AA (design 5). */
export const TAP_TARGET = 44;

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
 *
 * Это раскладка для широкого экрана — карточка в потоке страницы. На телефоне
 * тот же поиск показывает `InviteSheet`.
 */
export function InvitePanel({ roomId, theme, onInvite, onInviteByLink }: InvitePanelProps) {
  return (
    <section aria-label="invite" className="px-3 mb-5">
      <div className="p-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <InviteForm roomId={roomId} theme={theme} onInvite={onInvite} onInviteByLink={onInviteByLink} />
      </div>
    </section>
  );
}

interface InviteSheetProps extends InvitePanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Приглашение на телефоне: лист почти во весь экран. Список найденных
 * прокручивается внутри листа, поле поиска закреплено сверху, а кнопки —
 * снизу: при открытой клавиатуре до них не нужно возвращаться прокруткой.
 */
export function InviteSheet({ open, onClose, roomId, theme, onInvite, onInviteByLink }: InviteSheetProps) {
  return (
    <Sheet
      open={open}
      title="Пригласить человека"
      subtitle="Найдите по нику или позовите ссылкой"
      theme={theme}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {onInviteByLink ? (
            <button
              type="button"
              onClick={onInviteByLink}
              className="flex-1 min-w-0 px-3 tap text-[15px] font-medium"
              style={{
                background: theme.surfaceAlt,
                color: theme.text,
                borderRadius: RADIUS.sm,
                minHeight: TAP_TARGET,
              }}
            >
              Пригласить ссылкой
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 px-3 tap text-[15px] font-medium"
            style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm, minHeight: TAP_TARGET }}
          >
            Готово
          </button>
        </div>
      }
    >
      <div className="px-5">
        <InviteForm roomId={roomId} theme={theme} onInvite={onInvite} inSheet />
      </div>
    </Sheet>
  );
}

/**
 * Общая часть обеих раскладок: поиск по нику, найденные и ошибки. В листе поле
 * поиска липнет к верхнему краю прокрутки, а приглашение ссылкой живёт в
 * закреплённой панели действий — здесь его не дублируем.
 */
function InviteForm({
  roomId,
  theme,
  onInvite,
  onInviteByLink,
  inSheet = false,
}: InvitePanelProps & { inSheet?: boolean }) {
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
    <>
      <div
        data-testid="invite-search"
        className={inSheet ? 'sticky top-0 z-10 pt-1 pb-2' : ''}
        style={inSheet ? { background: theme.surface } : undefined}
      >
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
          style={{
            background: theme.surfaceAlt,
            borderRadius: RADIUS.sm,
            color: theme.text,
            fontSize: 16,
            minHeight: TAP_TARGET,
          }}
        />
      </div>

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
                style={{ opacity: candidate.already_member ? 0.55 : 1, minHeight: TAP_TARGET }}
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
          {onInviteByLink && !inSheet ? (
            <button
              type="button"
              onClick={onInviteByLink}
              className="mt-2 w-full py-2.5 tap text-[15px] font-medium"
              style={{
                background: theme.surfaceAlt,
                color: theme.text,
                borderRadius: RADIUS.sm,
                minHeight: TAP_TARGET,
              }}
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
    </>
  );
}
