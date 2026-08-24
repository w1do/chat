import type { ApiClient } from '@vendor/api-client';
import { memberSchema, roomSchema, type CreateRoomInput, type Member, type Room } from './schemas/room';

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
  async update(client: ApiClient, roomId: string, input: Partial<CreateRoomInput>): Promise<Room> {
    return roomSchema.parse(((await client.patch(`/rooms/${roomId}`, { body: input })) as { data: unknown }).data);
  },
  async archive(client: ApiClient, roomId: string): Promise<void> {
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
