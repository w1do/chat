import { z } from 'zod';

export const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  reacted_by_me: z.boolean(),
});

export const messageSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  author_id: z.string(),
  author_name: z.string().nullable(),
  reply_to_id: z.string().nullable(),
  body: z.string().nullable(),
  mentions: z.array(z.string()),
  edited_at: z.string().nullable(),
  deleted: z.boolean(),
  created_at: z.string(),
  reactions: z.array(reactionSchema),
});

export const messagePageSchema = z.object({
  data: z.array(messageSchema),
  meta: z.object({ next_cursor: z.string().nullable() }),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'validation.required').max(4000),
  reply_to_id: z.string().nullable().optional(),
  mentions: z.array(z.string()).max(20).optional(),
});

export type Reaction = z.infer<typeof reactionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
