import {
  InvitePanel,
  InviteSheet,
  MemberRow,
  RoomManagePanel,
  useMembers,
  useMembershipActions,
  useRoom,
  useRoomActions,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import {
  Group,
  Row,
  Screen,
  THEMES,
  useKeyboardInsets,
  useMediaQuery,
  type ThemeTokens,
} from '@vendor/ui';
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const { height, offsetTop } = useKeyboardInsets();
  // Телефон: приглашение открывается листом почти во весь экран. На широком
  // экране места хватает, и карточка остаётся в потоке страницы.
  const compact = useMediaQuery('(max-width: 640px)');

  const myRole = room.data?.my_role ?? null;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const inviteByLink = () => {
    setError(null);
    createInvite(roomId, room.data?.name ?? '')
      .then((result) => setNotice(result.copied ? 'Приглашение скопировано.' : `Ссылка: ${result.link}`))
      .catch(() => setError('Не удалось создать ссылку-приглашение.'));
  };

  return (
    // Экран занимает ровно видимую область и компенсирует прокрутку, которую
    // iOS Safari делает сам при открытии клавиатуры, — иначе поле поиска
    // приглашения оказывается под клавиатурой, а шапка уезжает за край.
    // Страница неподвижна: прокручивается содержимое внутри Screen.
    <div
      className="w-full flex justify-center"
      style={{
        background: theme.bg,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: height ? `${height}px` : '100dvh',
        transform: offsetTop ? `translateY(${offsetTop}px)` : undefined,
        overflow: 'hidden',
      }}
    >
      {/* relative — система координат для листа приглашения (absolute inset-0). */}
      <main className="relative h-full w-full max-w-md overflow-hidden" style={{ color: theme.text }}>
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
              onSetPhoto={(file) => roomActions.setPhoto.mutateAsync(file)}
              onClearPhoto={() => roomActions.clearPhoto.mutateAsync()}
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
            compact ? (
              <Group theme={theme}>
                <Row
                  theme={theme}
                  title="Пригласить человека"
                  hint="Поиск по нику или ссылка"
                  last
                  onClick={() => setInviteOpen(true)}
                />
              </Group>
            ) : (
              <InvitePanel
                roomId={roomId}
                theme={theme}
                onInvite={(userId) => actions.invite.mutateAsync(userId)}
                onInviteByLink={inviteByLink}
              />
            )
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

        {canManage && room.data && compact ? (
          <InviteSheet
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            roomId={roomId}
            theme={theme}
            onInvite={(userId) => actions.invite.mutateAsync(userId)}
            onInviteByLink={inviteByLink}
          />
        ) : null}
      </main>
    </div>
  );
}
