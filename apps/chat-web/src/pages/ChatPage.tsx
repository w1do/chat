import {
  CreateRoomForm,
  MessageComposer,
  MessageList,
  RoomHeader,
  RoomList,
  useCreateRoom,
  useDeleteMessage,
  useEditMessage,
  useMembers,
  useMessages,
  useReactions,
  useRoom,
  useRooms,
  useSendMessage,
  type Message,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import { useState } from 'react';
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
  const members = useMembers(roomId);
  const messages = useMessages(roomId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const send = useSendMessage(roomId, user?.id ?? '');
  const edit = useEditMessage(roomId);
  const remove = useDeleteMessage(roomId);
  const react = useReactions(roomId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);

  if (room.isLoading) return <p aria-busy="true">Загрузка комнаты…</p>;
  if (room.error || !room.data) return <p role="alert">Не удалось открыть комнату.</p>;

  const canModerate = room.data.my_role === 'owner' || room.data.my_role === 'admin';
  const flatMessages = messages.data?.pages.flatMap((page) => page.data);

  return (
    <section>
      <RoomHeader room={room.data} onOpenSettings={() => navigate(`/rooms/${roomId}/settings`)} />

      <MessageList
        messages={flatMessages}
        isLoading={messages.isLoading}
        error={messages.error ?? undefined}
        currentUserId={user?.id ?? ''}
        canModerate={canModerate}
        hasMore={messages.hasNextPage}
        onLoadMore={() => void messages.fetchNextPage()}
        onReply={(message) => {
          setEditing(null);
          setReplyTo(message);
        }}
        onEdit={(message) => {
          setReplyTo(null);
          setEditing(message);
        }}
        onDelete={(messageId) => void remove.mutateAsync(messageId)}
        onToggleReaction={(messageId, emoji) => react.mutate({ messageId, emoji })}
      />

      <MessageComposer
        key={editing?.id ?? 'composer'}
        onSend={(input) => send.mutateAsync(input)}
        members={members.data}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onSubmitEdit={(messageId, body) => edit.mutateAsync({ messageId, body })}
        onCancelEdit={() => setEditing(null)}
      />
    </section>
  );
}
