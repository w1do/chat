import { z } from 'zod';

// Вход максимально короткий: логин и пароль (design 1b).
const login = z
  .string()
  .min(3, 'Логин короче трёх символов')
  .max(64, 'Логин длиннее 64 символов')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Латиница, цифры, точка, дефис или подчёркивание');

export const loginSchema = z.object({
  login: z.string().min(1, 'Заполните это поле'),
  password: z.string().min(1, 'Заполните это поле'),
  remember: z.boolean().optional(),
});

/**
 * Требование к паролю задаёт установка, а не форма: интерфейс не должен быть
 * строже сервера. Значение приходит приложением, поэтому схемы с паролем —
 * функции, а не константы.
 */
export function passwordRule(minLength: number) {
  return z.string().min(minLength, passwordHint(minLength));
}

/** Одно и то же объяснение и в подсказке под полем, и в тексте ошибки. */
export function passwordHint(minLength: number): string {
  return minLength <= 1 ? 'Любой пароль, хотя бы один символ' : `Не короче ${minLength} символов`;
}

export const registerSchema = (minLength: number) =>
  z.object({
    login,
    password: passwordRule(minLength),
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Заполните это поле').email('Похоже, это не адрес почты'),
});

export const resetPasswordSchema = (minLength: number) =>
  z.object({
    email: z.string().min(1, 'Заполните это поле').email('Похоже, это не адрес почты'),
    token: z.string().min(1, 'Заполните это поле'),
    password: passwordRule(minLength),
  });

export const profileSchema = z.object({
  name: z.string().min(1, 'Заполните это поле').max(255),
  locale: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/, 'Локаль записывается как ru или ru_RU'),
  timezone: z.string().min(1, 'Заполните это поле'),
});

export const emailSchema = z.object({
  email: z.union([z.string().email('Похоже, это не адрес почты'), z.literal('')]),
});

export const passwordChangeSchema = (minLength: number) =>
  z.object({
    current_password: z.string().min(1, 'Заполните это поле'),
    password: passwordRule(minLength),
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<ReturnType<typeof registerSchema>>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<ReturnType<typeof resetPasswordSchema>>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type PasswordChangeInput = z.infer<ReturnType<typeof passwordChangeSchema>>;
