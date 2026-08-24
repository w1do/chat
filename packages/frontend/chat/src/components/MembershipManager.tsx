import { useState, type FormEvent } from 'react';
import type { Member } from '../schemas/room';

interface MembershipManagerProps {
  members: Member[] | undefined;
  isLoading: boolean;
  error?: unknown;
  myRole: 'owner' | 'admin' | 'member' | null;
  onInvite: (userId: string) => Promise<unknown>;
  onChangeRole: (memberId: string, role: 'admin' | 'member') => Promise<unknown>;
  onLeave: () => Promise<unknown>;
}

/** Управление участниками: список, приглашение, смена ролей, выход. */
export function MembershipManager({
  members,
  isLoading,
  error,
  myRole,
  onInvite,
  onChangeRole,
  onLeave,
}: MembershipManagerProps) {
  const [inviteId, setInviteId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <p aria-busy="true">Загрузка участников…</p>;
  if (error) return <p role="alert">Не удалось загрузить участников.</p>;

  const canManage = myRole === 'owner' || myRole === 'admin';

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteId.trim()) return;
    setActionError(null);
    try {
      await onInvite(inviteId.trim());
      setInviteId('');
    } catch {
      setActionError('Не удалось пригласить пользователя.');
    }
  };

  return (
    <section aria-label="Участники">
      {actionError ? <p role="alert">{actionError}</p> : null}

      <ul>
        {(members ?? []).map((member) => (
          <li key={member.id}>
            <span>
              {member.name ?? member.user_id} — {member.role}
            </span>
            {myRole === 'owner' && member.role !== 'owner' ? (
              <button
                type="button"
                onClick={() =>
                  onChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin').catch(() =>
                    setActionError('Не удалось изменить роль.'),
                  )
                }
              >
                {member.role === 'admin' ? 'Сделать участником' : 'Сделать админом'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <form onSubmit={submitInvite} aria-label="invite">
          <label htmlFor="invite-user-id">ID пользователя</label>
          <input
            id="invite-user-id"
            value={inviteId}
            onChange={(event) => setInviteId(event.target.value)}
          />
          <button type="submit">Пригласить</button>
        </form>
      ) : null}

      {myRole !== null && myRole !== 'owner' ? (
        <button type="button" onClick={() => onLeave().catch(() => setActionError('Не удалось выйти из комнаты.'))}>
          Покинуть комнату
        </button>
      ) : null}
    </section>
  );
}
