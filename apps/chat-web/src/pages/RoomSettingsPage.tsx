import { MembershipManager, useMembers, useMembershipActions, useRoom } from '@vendor/chat';
import { useNavigate, useParams } from 'react-router-dom';

export function RoomSettingsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  if (!roomId) return null;

  return <Settings roomId={roomId} onLeft={() => navigate('/')} />;
}

function Settings({ roomId, onLeft }: { roomId: string; onLeft: () => void }) {
  const room = useRoom(roomId);
  const members = useMembers(roomId);
  const actions = useMembershipActions(roomId);

  if (room.isLoading) return <main aria-busy="true">Загрузка…</main>;
  if (room.error || !room.data) return <main role="alert">Не удалось открыть настройки комнаты.</main>;

  return (
    <main>
      <h1>Настройки: {room.data.name}</h1>
      <MembershipManager
        members={members.data}
        isLoading={members.isLoading}
        error={members.error ?? undefined}
        myRole={room.data.my_role}
        onInvite={(userId) => actions.invite.mutateAsync(userId)}
        onChangeRole={(memberId, role) => actions.changeRole.mutateAsync({ memberId, role })}
        onLeave={async () => {
          await actions.leave.mutateAsync();
          onLeft();
        }}
      />
    </main>
  );
}
