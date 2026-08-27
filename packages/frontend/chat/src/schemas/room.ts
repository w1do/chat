import { z } from 'zod';

/** Собеседник диалога: подпись, ник и аватарка — всё для списка и шапки. */
export const counterpartSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  /** Активность была не давнее окна присутствия — «В сети». */
  is_online: z.boolean(),
  /** Момент последней активности; null — неизвестен. */
  last_seen_at: z.string().nullable(),
});

export const roomSchema = z.object({
  id: z.string(),
  /** Название комнаты; у диалога его нет — подпись даёт собеседник. */
  name: z.string().nullable(),
  topic: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  /** Вид переписки: комната или личный диалог. */
  kind: z.enum(['room', 'direct']),
  created_by: z.string(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  my_role: z.enum(['owner', 'admin', 'member']).nullable(),
  member_count: z.number().nullable(),
  unread_count: z.number().nullable(),
  /** Фотография комнаты или аватарка собеседника; null — рисуется эмодзи. */
  photo_url: z.string().nullable(),
  photo_large_url: z.string().nullable(),
  /** Собеседник диалога; у комнаты отсутствует. */
  counterpart: counterpartSchema.nullable(),
});

/** Подпись переписки: название комнаты или имя собеседника (design 5). */
export function roomLabel(room: Pick<Room, 'kind' | 'name' | 'counterpart'>): string {
  if (room.kind === 'direct') return room.counterpart?.name ?? 'Диалог';

  return room.name ?? '';
}

export const memberSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  joined_at: z.string(),
  name: z.string().nullable(),
  /** Ник для упоминания `@username`; null — у пользователя ника нет. */
  username: z.string().nullable(),
  /** Аватарка участника; null — рисуется буква имени. */
  avatar_url: z.string().nullable(),
  /** Активность была не давнее окна присутствия — «В сети». */
  is_online: z.boolean(),
  /** Момент последней активности; null — неизвестен. */
  last_seen_at: z.string().nullable(),
});

/** Кого можно позвать: ник и имя, плюс отметка «уже в комнате». */
export const memberCandidateSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  already_member: z.boolean(),
});

/** Изображение профиля или комнаты; thumb_url пуст, пока производная готовится. */
export const profileImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumb_url: z.string().nullable(),
  current: z.boolean().optional(),
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
export type Counterpart = z.infer<typeof counterpartSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type Member = z.infer<typeof memberSchema>;
export type MemberCandidate = z.infer<typeof memberCandidateSchema>;
export type ProfileImage = z.infer<typeof profileImageSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
