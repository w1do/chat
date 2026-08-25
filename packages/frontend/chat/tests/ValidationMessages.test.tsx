import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createRoomSchema, updateRoomSchema } from '../src/schemas/room';
import { sendMessageSchema } from '../src/schemas/message';

/**
 * Сообщение об ошибке читает человек: служебный ключ, забытый в схеме, доезжает
 * до экрана как есть. Тот же сторож стоит в пакете identity.
 */
const schemas: Array<[string, z.ZodTypeAny]> = [
  ['создание комнаты', createRoomSchema],
  ['изменение комнаты', updateRoomSchema],
  ['отправка сообщения', sendMessageSchema],
];

describe('сообщения об ошибках', () => {
  it.each(schemas)('форма «%s» объясняет ошибку, а не показывает код', (_name, schema) => {
    const issues = [{}, { name: '', body: '', topic: '', visibility: 'нет такой' }].flatMap((value) => {
      const result = schema.safeParse(value);

      return result.success ? [] : result.error.issues;
    });

    expect(issues.length).toBeGreaterThan(0);

    for (const issue of issues) {
      expect(issue.message).not.toMatch(/^validation\./);
      expect(issue.message).not.toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});
