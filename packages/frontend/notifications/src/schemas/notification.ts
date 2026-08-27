import { z } from 'zod';

export const notificationCategorySchema = z.enum(['message', 'mention', 'room_invite', 'security']);
export const notificationChannelSchema = z.enum(['database', 'mail', 'push']);

export const notificationSchema = z.object({
  id: z.string(),
  category: notificationCategorySchema,
  room_id: z.string().nullable(),
  room_name: z.string().nullable(),
  actor_name: z.string().nullable(),
  preview: z.string(),
  group_count: z.number(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export const notificationFeedSchema = z.object({
  data: z.array(notificationSchema),
  meta: z.object({ unread: z.number() }),
});

export const preferenceSchema = z.object({
  category: notificationCategorySchema,
  category_label: z.string(),
  channel: notificationChannelSchema,
  channel_label: z.string(),
  enabled: z.boolean(),
  locked: z.boolean(),
});

export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationFeed = z.infer<typeof notificationFeedSchema>;
export type NotificationPreference = z.infer<typeof preferenceSchema>;
