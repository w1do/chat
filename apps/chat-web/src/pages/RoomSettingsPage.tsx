import { useMembers, useMembershipActions, useRoom } from '@vendor/chat';
import { Avatar, Group, RADIUS, Row, Screen, THEMES, type ThemeTokens } from '@vendor/ui';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSettings } from '../app/settings';

const ROLE_LABEL: Record<string, string> = {
  owner: 'владелец',
  admin: 'администратор',
  member: 'участник',
};

/** Экран участников комнаты: список, приглашение, роли, выход. */
export function RoomSettingsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const theme: ThemeTokens = THEMES[settings.theme];

  if (!roomId) return null;

  return <Members roomId={roomId} theme={theme} onBack={() => navigate(`/rooms/${roomId}`)} onLeft={() => navigate('/')} />;
}

function Members({
  roomId,
  theme,
  onBack,
  onLeft,
}: {
  roomId: string;
  theme: ThemeTokens;
  onBack: () => void;
  onLeft: () => void;
}) {
  const room = useRoom(roomId);
  const members = useMembers(roomId);
  const actions = useMembershipActions(roomId);
  const [inviteId, setInviteId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const myRole = room.data?.my_role ?? null;
  const canManage = myRole === 'owner' || myRole === 'admin';

  return (
    // Страница неподвижна: прокручивается содержимое внутри Screen.
    <div className="h-full w-full flex justify-center" style={{ background: theme.bg }}>
      <main className="h-full w-full max-w-md" style={{ color: theme.text }}>
        <Screen
          theme={theme}
          contentStyle={{ paddingTop: 8, paddingBottom: 24 }}
          header={
            <header className="flex items-center gap-2 px-2 pb-3 safe-top">
              <button
                type="button"
                onClick={onBack}
                aria-label="Назад"
                className="tap grid place-items-center"
                style={{ width: 34, height: 34, color: theme.text }}
              >
                <ChevronLeft size={26} />
              </button>
              <h1 className="text-[20px] font-semibold truncate" style={{ letterSpacing: '-0.02em' }}>
                {room.data?.name ?? 'Комната'}
              </h1>
            </header>
          }
        >

          {members.isLoading ? (
            <p aria-busy="true" className="px-5 py-6 text-[15px]" style={{ color: theme.muted }}>
              Загрузка участников…
            </p>
          ) : members.error ? (
            <p role="alert" className="px-5 py-6 text-[15px]" style={{ color: theme.danger }}>
              Не удалось загрузить участников.
            </p>
          ) : (
            <Group theme={theme} label={`Участники · ${members.data?.length ?? 0}`}>
              {(members.data ?? []).map((member, index) => (
                <Row
                  key={member.id}
                  theme={theme}
                  title={member.name ?? member.user_id}
                  hint={ROLE_LABEL[member.role]}
                  last={index === (members.data?.length ?? 0) - 1}
                  right={
                    myRole === 'owner' && member.role !== 'owner' ? (
                      <button
                        type="button"
                        className="text-[13px] tap"
                        style={{ color: theme.amberText }}
                        onClick={() =>
                          actions.changeRole
                            .mutateAsync({ memberId: member.id, role: member.role === 'admin' ? 'member' : 'admin' })
                            .catch(() => setError('Не удалось изменить роль.'))
                        }
                      >
                        {member.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                      </button>
                    ) : (
                      <Avatar userId={member.user_id} name={member.name ?? member.user_id} size={30} theme={theme} />
                    )
                  }
                />
              ))}
            </Group>
          )}

          {error ? (
            <p role="alert" className="px-5 pb-3 text-[13px]" style={{ color: theme.danger }}>
              {error}
            </p>
          ) : null}

          {canManage ? (
            <form
              aria-label="invite"
              className="px-3 mb-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!inviteId.trim()) return;
                setError(null);
                try {
                  await actions.invite.mutateAsync(inviteId.trim());
                  setInviteId('');
                } catch {
                  setError('Не удалось пригласить пользователя.');
                }
              }}
            >
              <div className="p-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
                <label htmlFor="invite-user-id" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
                  ID пользователя
                </label>
                <input
                  id="invite-user-id"
                  value={inviteId}
                  onChange={(event) => setInviteId(event.target.value)}
                  className="w-full px-3 py-2 mb-3 outline-none"
                  style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
                />
                <button
                  type="submit"
                  className="w-full py-2.5 tap text-[15px] font-medium"
                  style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm }}
                >
                  Пригласить
                </button>
              </div>
            </form>
          ) : null}

          {myRole !== null && myRole !== 'owner' ? (
            <Group theme={theme}>
              <Row
                theme={theme}
                title="Покинуть комнату"
                last
                onClick={() =>
                  actions.leave
                    .mutateAsync()
                    .then(onLeft)
                    .catch(() => setError('Не удалось выйти из комнаты.'))
                }
              />
            </Group>
          ) : null}
        </Screen>
      </main>
    </div>
  );
}
