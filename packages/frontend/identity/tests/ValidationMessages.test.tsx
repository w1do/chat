import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from '../src/schemas/auth';

/**
 * Сообщения об ошибках читает человек. Служебный ключ, случайно оставленный в
 * схеме, доезжает до экрана как есть — так пользователь и увидел
 * `validation.password_min` вместо объяснения. Этот тест держит границу.
 */
const schemas: Array<[string, z.ZodTypeAny]> = [
  ['вход', loginSchema],
  ['регистрация', registerSchema(1)],
  ['восстановление', forgotPasswordSchema],
  ['новый пароль по ссылке', resetPasswordSchema(1)],
  ['профиль', profileSchema],
  ['почта', emailSchema],
  ['смена пароля', passwordChangeSchema(12)],
];

/** Заведомо негодный ввод: пустые строки и мусор во всех полях сразу. */
function issuesOf(schema: z.ZodTypeAny): z.ZodIssue[] {
  const attempts: unknown[] = [
    {},
    { login: '', password: '', email: 'не почта', token: '', name: '', locale: 'РУ', timezone: '', current_password: '', body: '', visibility: 'public' },
    { login: 'а б в', password: 'x', email: '@', name: 'x'.repeat(300), body: 'x'.repeat(5000), visibility: 'нет такой' },
  ];

  return attempts.flatMap((value) => {
    const result = schema.safeParse(value);

    return result.success ? [] : result.error.issues;
  });
}

describe('сообщения об ошибках', () => {
  it.each(schemas)('форма «%s» объясняет ошибку, а не показывает код', (_name, schema) => {
    const issues = issuesOf(schema);
    expect(issues.length).toBeGreaterThan(0);

    for (const issue of issues) {
      // Ключ перевода — это не сообщение: словаря в проекте нет.
      expect(issue.message).not.toMatch(/^validation\./);
      expect(issue.message).not.toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it('называет длину пароля, которую требует установка', () => {
    const issue = passwordChangeSchema(12).safeParse({ current_password: 'x', password: '123' });
    expect(issue.success).toBe(false);
    expect(JSON.stringify(issue)).toContain('Не короче 12 символов');
  });
});
