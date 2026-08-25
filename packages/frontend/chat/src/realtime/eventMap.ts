// Типы версионированных real-time событий. Источник истины —
// packages/contracts/realtime/*.schema.json; типы повторяют схемы 1:1.

interface Envelope<TEvent extends string, TData> {
  event: TEvent;
  version: 1;
  room_id: string;
  occurred_at: string;
  data: TData;
}

export type MessageCreatedV1 = Envelope<'message.created.v1', {
  id: string;
  kind: 'text' | 'system';
  author: { id: string; name: string };
  body: string;
  /** Системное событие комнаты; текст формулирует клиент (design 1c). */
  payload: { event: 'member.joined' | 'member.invited' | 'member.left'; actor_id: string } | null;
  reply_to_id: string | null;
  created_at: string;
}>;

export type MessageUpdatedV1 = Envelope<'message.updated.v1', {
  id: string;
  body: string;
  edited_at: string;
}>;

export type MessageDeletedV1 = Envelope<'message.deleted.v1', {
  id: string;
  deleted_at: string;
}>;

export type ReactionChangedV1 = Envelope<'reaction.changed.v1', {
  message_id: string;
  user_id: string;
  emoji: string;
  action: 'added' | 'removed';
  count: number;
}>;

export type RoomMemberChangedV1 = Envelope<'room.member_changed.v1', {
  user_id: string;
  action: 'joined' | 'left' | 'invited' | 'role_changed' | 'removed';
  role: 'owner' | 'admin' | 'member' | null;
}>;

export type RoomDeletedV1 = Envelope<'room.deleted.v1', {
  name: string;
}>;

export type TypingChangedV1 = Envelope<'typing.changed.v1', {
  user_id: string;
  is_typing: boolean;
}>;

export type RoomEvent =
  | MessageCreatedV1
  | MessageUpdatedV1
  | MessageDeletedV1
  | ReactionChangedV1
  | RoomMemberChangedV1
  | RoomDeletedV1;

export type PresenceEvent = TypingChangedV1;

export const ROOM_EVENT_NAMES = [
  'message.created.v1',
  'message.updated.v1',
  'message.deleted.v1',
  'reaction.changed.v1',
  'room.member_changed.v1',
  'room.deleted.v1',
] as const;

export const PRESENCE_EVENT_NAMES = ['typing.changed.v1'] as const;
