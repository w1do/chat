import type { ApiClient } from '@vendor/api-client';
import {
  memberCandidateSchema,
  memberSchema,
  profileImageSchema,
  roomSchema,
  type CreateRoomInput,
  type Member,
  type MemberCandidate,
  type ProfileImage,
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
  /** Фотография комнаты: ставят владелец и админ. */
  async setPhoto(client: ApiClient, roomId: string, file: File): Promise<ProfileImage> {
    const body = new FormData();
    body.append('image', file);

    return profileImageSchema.parse(
      ((await client.post(`/rooms/${roomId}/photo`, { body })) as { data: unknown }).data,
    );
  },
  async clearPhoto(client: ApiClient, roomId: string): Promise<void> {
    await client.delete(`/rooms/${roomId}/photo`);
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
  /** Кого можно позвать в комнату: поиск по началу ника. */
  async memberCandidates(client: ApiClient, roomId: string, query: string): Promise<MemberCandidate[]> {
    const response = (await client.get(`/rooms/${roomId}/member-candidates`, { query: { query } })) as {
      data: unknown[];
    };

    return response.data.map((candidate) => memberCandidateSchema.parse(candidate));
  },
  /** Исключение участника: владелец — любого, админ — обычного участника. */
  async removeMember(client: ApiClient, roomId: string, memberId: string): Promise<void> {
    await client.delete(`/rooms/${roomId}/members/${memberId}`);
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

import { attachmentSchema, messagePageSchema, messageSchema, reactionSchema } from './schemas/message';
import type { Attachment, Message, MessagePage, Reaction, SendMessageInput } from './schemas/message';

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

// --- Вложения ----------------------------------------------------------------

export const attachmentsApi = {
  /** Файл загружается до отправки: у каждого свой ход и своя ошибка (design 3). */
  async upload(client: ApiClient, roomId: string, file: File): Promise<Attachment> {
    const body = new FormData();
    body.append('file', file);

    return attachmentSchema.parse(
      ((await client.post(`/rooms/${roomId}/attachments`, { body })) as { data: unknown }).data,
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
