import { z } from 'zod';

// Zod-схемы форм; сообщения — ключи для i18n на уровне приложения.
export const loginSchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(1, 'validation.required'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'validation.required').max(255),
  email: z.string().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(10, 'validation.password_min'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.email'),
});

export const resetPasswordSchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.email'),
  token: z.string().min(1, 'validation.required'),
  password: z.string().min(10, 'validation.password_min'),
});

export const profileSchema = z.object({
  name: z.string().min(1, 'validation.required').max(255),
  locale: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'validation.locale'),
  timezone: z.string().min(1, 'validation.required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
