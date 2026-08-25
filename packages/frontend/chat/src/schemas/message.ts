import { z } from 'zod';

export const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  reacted_by_me: z.boolean(),
});

export const systemPayloadSchema = z.object({
  event: z.enum(['member.joined', 'member.invited', 'member.left']),
  actor_id: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  kind: z.enum(['text', 'system']),
  author_id: z.string(),
  author_name: z.string().nullable(),
  reply_to_id: z.string().nullable(),
  body: z.string().nullable(),
  mentions: z.array(z.string()),
  edited_at: z.string().nullable(),
  deleted: z.boolean(),
  created_at: z.string(),
  reactions: z.array(reactionSchema),
  payload: systemPayloadSchema.nullable(),
});

export const messagePageSchema = z.object({
  data: z.array(messageSchema),
  meta: z.object({ next_cursor: z.string().nullable() }),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Сообщение не может быть пустым').max(4000),
  reply_to_id: z.string().nullable().optional(),
  mentions: z.array(z.string()).max(20).optional(),
});

export type Reaction = z.infer<typeof reactionSchema>;
export type SystemPayload = z.infer<typeof systemPayloadSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
