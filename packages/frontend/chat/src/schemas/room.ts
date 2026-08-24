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
});

export const memberSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  joined_at: z.string(),
  name: z.string().nullable(),
});

export const createRoomSchema = z.object({
  name: z.string().min(1, 'validation.required').max(255),
  topic: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']),
});

export type Room = z.infer<typeof roomSchema>;
export type Member = z.infer<typeof memberSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
