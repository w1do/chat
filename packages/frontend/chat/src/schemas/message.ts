import { z } from 'zod';

export const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  reacted_by_me: z.boolean(),
});

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime_type: z.string(),
  size: z.number(),
  url: z.string(),
  /** null — миниатюра ещё готовится или файлу не положена (контракт). */
  thumb_url: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const systemPayloadSchema = z.object({
  event: z.enum(['member.joined', 'member.invited', 'member.left', 'member.removed']),
  actor_id: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  kind: z.enum(['text', 'system']),
  author_id: z.string(),
  author_name: z.string().nullable(),
  author_avatar_url: z.string().nullable(),
  reply_to_id: z.string().nullable(),
  body: z.string().nullable(),
  mentions: z.array(z.string()),
  /** Сообщение правили после отправки — в ленте стоит метка. */
  is_edited: z.boolean(),
  edited_at: z.string().nullable(),
  deleted: z.boolean(),
  created_at: z.string(),
  reactions: z.array(reactionSchema),
  payload: systemPayloadSchema.nullable(),
  // У удалённого сообщения поля нет вовсе — вложения не перечисляются.
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const messagePageSchema = z.object({
  data: z.array(messageSchema),
  meta: z.object({ next_cursor: z.string().nullable() }),
});

export const sendMessageSchema = z
  .object({
    body: z.string().max(4000, 'Не длиннее 4000 знаков').optional(),
    reply_to_id: z.string().nullable().optional(),
    mentions: z.array(z.string()).max(20).optional(),
    attachments: z.array(z.string()).optional(),
  })
  .refine((input) => (input.body ?? '').trim() !== '' || (input.attachments?.length ?? 0) > 0, {
    message: 'Сообщение не может быть пустым',
    path: ['body'],
  });

export type Attachment = z.infer<typeof attachmentSchema>;
export type Reaction = z.infer<typeof reactionSchema>;
export type SystemPayload = z.infer<typeof systemPayloadSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessagePage = z.infer<typeof messagePageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
