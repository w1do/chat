import { z } from 'zod';

export const revisionOperationSchema = z.enum(['fix', 'clarify', 'shorten', 'expand', 'tone', 'custom']);
export const revisionToneSchema = z.enum(['friendly', 'neutral', 'formal', 'softer']);

export const revisionSchema = z.object({
  request_id: z.string(),
  operation: revisionOperationSchema,
  original: z.string(),
  suggestion: z.string(),
  provider: z.string(),
  model: z.string(),
});

export const revisionRequestSchema = z.object({
  operation: revisionOperationSchema,
  text: z.string().min(2).max(2000),
  tone: revisionToneSchema.optional(),
  instruction: z.string().max(200).optional(),
});

export type RevisionOperation = z.infer<typeof revisionOperationSchema>;
export type RevisionTone = z.infer<typeof revisionToneSchema>;
export type Revision = z.infer<typeof revisionSchema>;
export type RevisionRequest = z.infer<typeof revisionRequestSchema>;
