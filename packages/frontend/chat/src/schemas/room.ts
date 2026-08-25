import { z } from 'zod';

export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  topic: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  created_by: z.string(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  my_role: z.enum(['owner', 'admin', 'member']).nullable(),
  member_count: z.number().nullable(),
  unread_count: z.number().nullable(),
});

export const memberSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  joined_at: z.string(),
  name: z.string().nullable(),
});

/** Кого можно позвать: ник и имя, плюс отметка «уже в комнате». */
export const memberCandidateSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  already_member: z.boolean(),
});

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Название не может быть пустым').max(255),
  topic: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']),
});

/** Правка комнаты: название непустое, описание может быть пустым. */
export const updateRoomSchema = z.object({
  name: z.string().trim().min(1, 'Название не может быть пустым').max(255),
  topic: z.string().max(500),
});

export type Room = z.infer<typeof roomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type Member = z.infer<typeof memberSchema>;
export type MemberCandidate = z.infer<typeof memberCandidateSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
