import type { ApiClient } from '@vendor/api-client';
import {
  memberSchema,
  roomSchema,
  type CreateRoomInput,
  type Member,
  type Room,
  type UpdateRoomInput,
} from './schemas/room';

export const roomsApi = {
  async list(client: ApiClient, params: { search?: string } = {}): Promise<Room[]> {
    const response = (await client.get('/rooms', { query: params })) as { data: unknown[] };
    return response.data.map((room) => roomSchema.parse(room));
  },
  async get(client: ApiClient, roomId: string): Promise<Room> {
    return roomSchema.parse(((await client.get(`/rooms/${roomId}`)) as { data: unknown }).data);
  },
  async create(client: ApiClient, input: CreateRoomInput): Promise<Room> {
    return roomSchema.parse(((await client.post('/rooms', { body: input })) as { data: unknown }).data);
  },
  async update(client: ApiClient, roomId: string, input: UpdateRoomInput): Promise<Room> {
    return roomSchema.parse(((await client.patch(`/rooms/${roomId}`, { body: input })) as { data: unknown }).data);
  },
  async archive(client: ApiClient, roomId: string): Promise<void> {
    await client.post(`/rooms/${roomId}/archive`);
  },
  /** Удаление навсегда: комната и вся её переписка. Только владелец. */
  async remove(client: ApiClient, roomId: string): Promise<void> {
    await client.delete(`/rooms/${roomId}`);
  },
  async members(client: ApiClient, roomId: string): Promise<Member[]> {
    const response = (await client.get(`/rooms/${roomId}/members`)) as { data: unknown[] };
    return response.data.map((member) => memberSchema.parse(member));
  },
  async invite(client: ApiClient, roomId: string, userId: string): Promise<Member> {
    return memberSchema.parse(
      ((await client.post(`/rooms/${roomId}/members`, { body: { user_id: userId } })) as { data: unknown }).data,
    );
  },
  async join(client: ApiClient, roomId: string): Promise<Member> {
    return memberSchema.parse(((await client.post(`/rooms/${roomId}/members/me`)) as { data: unknown }).data);
  },
  async leave(client: ApiClient, roomId: string): Promise<void> {
    await client.delete(`/rooms/${roomId}/members/me`);
  },
  async changeRole(client: ApiClient, roomId: string, memberId: string, role: 'admin' | 'member'): Promise<Member> {
    return memberSchema.parse(
      ((await client.patch(`/rooms/${roomId}/members/${memberId}`, { body: { role } })) as { data: unknown }).data,
    );
  },
};

// --- Сообщения ---------------------------------------------------------------

import { messagePageSchema, messageSchema, reactionSchema } from './schemas/message';
import type { Message, MessagePage, Reaction, SendMessageInput } from './schemas/message';

export const messagesApi = {
  async list(client: ApiClient, roomId: string, cursor?: string | null, limit = 50): Promise<MessagePage> {
    return messagePageSchema.parse(
      await client.get(`/rooms/${roomId}/messages`, { query: { cursor: cursor ?? undefined, limit } }),
    );
  },
  async send(client: ApiClient, roomId: string, input: SendMessageInput, idempotencyKey?: string): Promise<Message> {
    return messageSchema.parse(
      ((await client.post(`/rooms/${roomId}/messages`, { body: input, idempotencyKey })) as { data: unknown }).data,
    );
  },
  async edit(client: ApiClient, messageId: string, body: string): Promise<Message> {
    return messageSchema.parse(
      ((await client.patch(`/messages/${messageId}`, { body: { body } })) as { data: unknown }).data,
    );
  },
  async remove(client: ApiClient, messageId: string): Promise<void> {
    await client.delete(`/messages/${messageId}`);
  },
  async toggleReaction(client: ApiClient, messageId: string, emoji: string): Promise<Reaction> {
    return reactionSchema.parse(
      ((await client.post(`/messages/${messageId}/reactions`, { body: { emoji } })) as { data: unknown }).data,
    );
  },
};

// --- Приглашения ---------------------------------------------------------

export interface Invite {
  id: string;
  room_id: string;
  room_name: string;
  invited_by_name: string | null;
  expires_at: string;
  /** Токен приходит только сразу после создания ссылки. */
  token: string | null;
}

export const invitesApi = {
  async create(client: ApiClient, roomId: string): Promise<Invite> {
    return ((await client.post(`/rooms/${roomId}/invites`)) as { data: Invite }).data;
  },
  async show(client: ApiClient, token: string): Promise<Invite> {
    return ((await client.get(`/invites/${token}`)) as { data: Invite }).data;
  },
  async accept(
    client: ApiClient,
    token: string,
    name?: string,
  ): Promise<{ room_id: string; created_account: boolean }> {
    const response = (await client.post(`/invites/${token}/accept`, {
      body: name === undefined ? {} : { name },
    })) as { data: { room_id: string; created_account: boolean } };

    return response.data;
  },
};

// --- Поиск -------------------------------------------------------------------

export const searchApi = {
  async messages(
    client: ApiClient,
    params: { q: string; roomId?: string; limit?: number },
  ): Promise<Message[]> {
    const response = (await client.get('/search/messages', {
      query: { q: params.q, room_id: params.roomId, limit: params.limit },
    })) as { data: unknown[] };

    return response.data.map((message) => messageSchema.parse(message));
  },
};

// --- Помощник (AI) -----------------------------------------------------------

import { revisionSchema, type Revision, type RevisionRequest } from './schemas/revision';

export const aiApi = {
  async revise(client: ApiClient, input: RevisionRequest, signal?: AbortSignal): Promise<Revision> {
    return revisionSchema.parse(
      ((await client.post('/ai/message-revisions', { body: input, signal })) as { data: unknown }).data,
    );
  },
};
