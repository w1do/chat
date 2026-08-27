import { Avatar, RADIUS, Row, type ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { formatLastSeen, ROLE_LABEL } from '../../format';
import type { Member, Room } from '../../schemas/room';

type RoomRole = NonNullable<Room['my_role']>;

/**
 * Кого можно исключить — те же правила, что и на сервере: владелец убирает
 * любого, кроме себя; админ — только участника с обычной ролью.
 */
export function canRemoveMember(myRole: RoomRole | null, myUserId: string, member: Member): boolean {
  if (member.user_id === myUserId) return false;
  if (myRole === 'owner') return true;
  if (myRole === 'admin') return member.role === 'member';

  return false;
}

/** Роль назначает только владелец и только не владельцу. */
export function canChangeRole(myRole: RoomRole | null, member: Member): boolean {
  return myRole === 'owner' && member.role !== 'owner';
}

interface MemberRowProps {
  member: Member;
  /** Кто сейчас в комнате по presence-каналу — свежее, чем метка из API. */
  present?: boolean;
  myRole: RoomRole | null;
  myUserId: string;
  theme: ThemeTokens;
  last?: boolean;
  onChangeRole: (role: 'admin' | 'member') => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  onError: (message: string) => void;
}

/** Строка участника: роль и — тем, кто вправе, — исключение из комнаты. */
export function MemberRow({
  member,
  present = false,
  myRole,
  myUserId,
  theme,
  last,
  onChangeRole,
  onRemove,
  onError,
}: MemberRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = member.name ?? member.user_id;
  const online = present || member.is_online;
  const removable = canRemoveMember(myRole, myUserId, member);
  const roleChangeable = canChangeRole(myRole, member);

  const remove = async () => {
    setBusy(true);
    try {
      await onRemove();
    } catch {
      onError('Не удалось исключить участника.');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Row
        theme={theme}
        title={name}
        // Роль и присутствие живут в одной строке: список остаётся плоским.
        hint={`${ROLE_LABEL[member.role]} · ${formatLastSeen(member.last_seen_at, { online })}`}
        last={last && !confirming}
        right={
          <span className="flex items-center gap-3 shrink-0">
            {roleChangeable ? (
              <button
                type="button"
                className="text-[13px] tap"
                style={{ color: theme.amberText }}
                onClick={() =>
                  onChangeRole(member.role === 'admin' ? 'member' : 'admin').catch(() =>
                    onError('Не удалось изменить роль.'),
                  )
                }
              >
                {member.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
              </button>
            ) : null}
            {removable ? (
              <button
                type="button"
                className="text-[13px] tap"
                style={{ color: theme.danger }}
                aria-label={`Исключить ${name}`}
                onClick={() => setConfirming(true)}
              >
                Исключить
              </button>
            ) : null}
            <Avatar
              userId={member.user_id}
              name={name}
              src={member.avatar_url}
              size={30}
              theme={theme}
              online={online}
            />
          </span>
        }
      />

      {/* Позвать обратно можно, поэтому подтверждение короткое — без набора имени. */}
      {confirming ? (
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: last ? 'none' : `1px solid ${theme.hairline}` }}
        >
          <p className="flex-1 min-w-0 text-[13px]" style={{ color: theme.muted }}>
            Исключить {name} из комнаты? Написанное им останется в переписке.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[13px] tap shrink-0"
            style={{ color: theme.muted }}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="text-[13px] tap shrink-0 px-2.5 py-1.5"
            style={{ background: theme.danger, color: theme.bg, borderRadius: RADIUS.sm, opacity: busy ? 0.5 : 1 }}
          >
            Исключить
          </button>
        </div>
      ) : null}
    </>
  );
}
