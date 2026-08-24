import {
  ConnectionBanner,
  CreateRoomForm,
  MessageComposer,
  MessageList,
  RoomHeader,
  RoomList,
  useCreateRoom,
  useDeleteMessage,
  useEditMessage,
  useMembers,
  useMembershipActions,
  useMessages,
  useReactions,
  useRoom,
  useRooms,
  useRealtimeRoom,
  useSendMessage,
  useTyping,
  PresenceDots,
  TypingIndicator,
  type Message,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { realtimeAdapter } from '../app/echo';

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

  const isMember = room.data?.my_role != null;
  const { connection, typingUserIds, presentMembers } = useRealtimeRoom(realtimeAdapter(), roomId, {
    enabled: isMember,
  });
  const typing = useTyping(roomId);
  const membership = useMembershipActions(roomId);

  if (room.isLoading) return <p aria-busy="true">Загрузка комнаты…</p>;
  if (room.error || !room.data) return <p role="alert">Не удалось открыть комнату.</p>;

  const canModerate = room.data.my_role === 'owner' || room.data.my_role === 'admin';
  const flatMessages = messages.data?.pages.flatMap((page) => page.data);

  return (
    <section>
      <RoomHeader room={room.data} onOpenSettings={() => navigate(`/rooms/${roomId}/settings`)} />
      <ConnectionBanner state={connection} />
      <PresenceDots members={presentMembers} />

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

      <TypingIndicator
        typingUserIds={typingUserIds}
        currentUserId={user?.id}
        namesById={new Map((members.data ?? []).map((m) => [m.user_id, m.name ?? m.user_id]))}
      />

      {isMember ? (
        <MessageComposer
          key={editing?.id ?? 'composer'}
          onSend={async (input) => {
            typing.stopTyping();
            return send.mutateAsync(input);
          }}
          members={members.data}
          onTyping={typing.notifyTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editing={editing}
          onSubmitEdit={(messageId, body) => edit.mutateAsync({ messageId, body })}
          onCancelEdit={() => setEditing(null)}
        />
      ) : (
        // Не-участник видит историю публичной комнаты, но писать не может,
        // пока не вступит (сервер отвечает 403 — UI не предлагает действие).
        <JoinPanel
          canJoin={room.data.visibility === 'public' && room.data.archived_at === null}
          isJoining={membership.join.isPending}
          error={membership.join.error}
          onJoin={async () => {
            await membership.join.mutateAsync();
            await room.refetch();
          }}
        />
      )}
    </section>
  );
}

function JoinPanel({
  canJoin,
  isJoining,
  error,
  onJoin,
}: {
  canJoin: boolean;
  isJoining: boolean;
  error: unknown;
  onJoin: () => Promise<void>;
}) {
  if (!canJoin) {
    return <p role="status">Вы не участник этой комнаты — отправка сообщений недоступна.</p>;
  }

  return (
    <div>
      <p role="status">Чтобы писать в комнату, нужно вступить в неё.</p>
      {error ? <p role="alert">Не удалось вступить в комнату.</p> : null}
      <button type="button" disabled={isJoining} onClick={() => void onJoin()}>
        {isJoining ? 'Вступаем…' : 'Вступить в комнату'}
      </button>
    </div>
  );
}
