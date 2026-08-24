import { z } from 'zod';

// Вход максимально короткий: логин и пароль (design 1b).
const login = z
  .string()
  .min(3, 'validation.login_min')
  .max(64, 'validation.login_max')
  .regex(/^[a-zA-Z0-9._-]+$/, 'validation.login_format');

export const loginSchema = z.object({
  login: z.string().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  login,
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

export const emailSchema = z.object({
  email: z.union([z.string().email('validation.email'), z.literal('')]),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'validation.required'),
  password: z.string().min(10, 'validation.password_min'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
