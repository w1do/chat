import {
  InvitePanel,
  MemberRow,
  RoomManagePanel,
  useMembers,
  useMembershipActions,
  useRoom,
  useRoomActions,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import { Group, Row, Screen, THEMES, type ThemeTokens } from '@vendor/ui';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createInvite } from '../app/invite';
import { useSettings } from '../app/settings';

/** Экран комнаты: название и описание, участники, приглашение, роли, выход. */
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
  const roomActions = useRoomActions(roomId);
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

          {room.data ? (
            <RoomManagePanel
              room={room.data}
              theme={theme}
              onSave={(input) => roomActions.update.mutateAsync(input)}
              onDelete={() => roomActions.remove.mutateAsync()}
              onDeleted={onLeft}
            />
          ) : null}

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
                <MemberRow
                  key={member.id}
                  member={member}
                  myRole={myRole}
                  myUserId={user?.id ?? ''}
                  theme={theme}
                  last={index === (members.data?.length ?? 0) - 1}
                  onChangeRole={(role) => actions.changeRole.mutateAsync({ memberId: member.id, role })}
                  onRemove={() => actions.remove.mutateAsync(member.id)}
                  onError={setError}
                />
              ))}
            </Group>
          )}

          {error ? (
            <p role="alert" className="px-5 pb-3 text-[13px]" style={{ color: theme.danger }}>
              {error}
            </p>
          ) : null}

          {notice ? (
            <p role="status" className="px-5 pb-3 text-[13px] break-all" style={{ color: theme.muted }}>
              {notice}
            </p>
          ) : null}

          {canManage && room.data ? (
            <InvitePanel
              roomId={roomId}
              theme={theme}
              onInvite={(userId) => actions.invite.mutateAsync(userId)}
              onInviteByLink={() => {
                setError(null);
                createInvite(roomId, room.data?.name ?? '')
                  .then((result) =>
                    setNotice(result.copied ? 'Приглашение скопировано.' : `Ссылка: ${result.link}`),
                  )
                  .catch(() => setError('Не удалось создать ссылку-приглашение.'));
              }}
            />
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
