import { invitesApi } from '@vendor/chat';
import { apiClient } from './api';

/**
 * Текст приглашения собирается на клиенте: адрес берётся из открытой
 * страницы, поэтому сервер не обязан знать свой публичный домен, а установка
 * за прокси ничего не настраивает.
 */
export function inviteMessage(roomName: string, token: string, expiresAt: string): string {
  const link = `${window.location.origin}/invite/${token}`;
  const until = new Date(expiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  return [
    `Привет! Приглашаю тебя в чат «${roomName}».`,
    `Ссылка: ${link}`,
    `Ссылка действует до ${until}.`,
  ].join('\n');
}

export interface InviteResult {
  text: string;
  link: string;
  copied: boolean;
}

/** Создаёт приглашение и кладёт готовый текст в буфер обмена. */
export async function createInvite(roomId: string, roomName: string): Promise<InviteResult> {
  const invite = await invitesApi.create(apiClient(), roomId);
  const text = inviteMessage(roomName, invite.token ?? '', invite.expires_at);
  const link = `${window.location.origin}/invite/${invite.token}`;

  try {
    await navigator.clipboard.writeText(text);

    return { text, link, copied: true };
  } catch {
    // Незащищённый контекст или запрет: показываем ссылку, чтобы человек
    // скопировал руками — молча терять приглашение нельзя.
    return { text, link, copied: false };
  }
}
