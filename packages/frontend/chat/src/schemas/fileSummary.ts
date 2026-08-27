import { z } from 'zod';

/** Документ, который пересказывает помощник: безопасные метаданные. */
export const summaryFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime_type: z.string(),
  size: z.number(),
});

export const fileSummaryStatusSchema = z.enum(['pending', 'processing', 'succeeded', 'failed', 'published']);

export const fileSummaryErrorSchema = z.enum([
  'provider_timeout',
  'provider_unavailable',
  'file_unreadable',
  'ai_disabled',
]);

export const fileSummarySchema = z.object({
  id: z.string(),
  status: fileSummaryStatusSchema,
  room_id: z.string(),
  message_id: z.string(),
  file: summaryFileSchema,
  /** Черновик пересказа; null, пока помощник не ответил. */
  summary: z.string().nullable(),
  lead_in: z.string(),
  error_code: fileSummaryErrorSchema.nullable(),
  published_message_id: z.string().nullable(),
  created_at: z.string(),
});

export const fileSummaryRequestSchema = z.object({
  message_id: z.string(),
  body: z.string().min(1).max(4000),
  idempotency_key: z.string().max(64).optional(),
  locale: z.enum(['ru', 'en']).optional(),
});

export type SummaryFile = z.infer<typeof summaryFileSchema>;
export type FileSummary = z.infer<typeof fileSummarySchema>;
export type FileSummaryStatus = z.infer<typeof fileSummaryStatusSchema>;
export type FileSummaryError = z.infer<typeof fileSummaryErrorSchema>;
export type FileSummaryRequest = z.infer<typeof fileSummaryRequestSchema>;

/** Токен, которым в ответе зовут помощника (совпадает с AI_SUMMARY_TRIGGER). */
export const SUMMARY_TRIGGER = '@ai';

/** Расширения, которые помощник берётся пересказывать (config ai.file_summary.types). */
export const SUMMARY_EXTENSIONS = ['pdf', 'docx', 'txt'] as const;

/** Документ ли это, который помощник умеет пересказать. */
export function isSummarizableAttachment(attachment: { name: string }): boolean {
  const extension = attachment.name.split('.').pop()?.toLowerCase() ?? '';

  return (SUMMARY_EXTENSIONS as readonly string[]).includes(extension);
}

/** Позвали ли помощника в черновике: `@ai` отдельным словом, а не частью слова. */
export function mentionsSummaryTrigger(draft: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${SUMMARY_TRIGGER}(?![\\p{L}\\p{N}])`, 'iu').test(draft);
}
