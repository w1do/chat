import { CreateRoomForm, RoomHeader, RoomList, useCreateRoom, useRoom, useRooms } from '@vendor/chat';
import { useNavigate, useParams } from 'react-router-dom';

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const rooms = useRooms();
  const createRoom = useCreateRoom();

  return (
    <main>
      <h1>Чат</h1>
      <aside>
        <RoomList
          rooms={rooms.data}
          isLoading={rooms.isLoading}
          error={rooms.error ?? undefined}
          activeRoomId={roomId}
          onSelect={(id) => navigate(`/rooms/${id}`)}
          onRetry={() => rooms.refetch()}
        />
        <CreateRoomForm
          onSubmit={async (input) => {
            const room = await createRoom.mutateAsync(input);
            navigate(`/rooms/${room.id}`);
          }}
        />
      </aside>
      {roomId ? <ActiveRoom roomId={roomId} /> : <p role="status">Выберите комнату.</p>}
    </main>
  );
}

function ActiveRoom({ roomId }: { roomId: string }) {
  const room = useRoom(roomId);
  const navigate = useNavigate();

  if (room.isLoading) return <p aria-busy="true">Загрузка комнаты…</p>;
  if (room.error || !room.data) return <p role="alert">Не удалось открыть комнату.</p>;

  return (
    <section>
      <RoomHeader room={room.data} onOpenSettings={() => navigate(`/rooms/${roomId}/settings`)} />
      {/* Сообщения появляются на этапе 6 */}
    </section>
  );
}
