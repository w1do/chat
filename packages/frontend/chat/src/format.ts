// Форматирование для ленты сообщений.

const MINUTE = 60 * 1000;

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const dayKey = (iso: string): string => new Date(iso).toDateString();

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);

  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export const ROLE_LABEL: Record<string, string> = {
  owner: 'владелец',
  admin: 'администратор',
  member: 'участник',
};

/** Сообщения подряд от одного автора — одна группа с общей цветной полоской. */
export interface MessageGroup<T> {
  key: string;
  authorId: string;
  day: string;
  items: T[];
}

export function buildGroups<T extends { id: string; author_id: string; created_at: string }>(
  messages: T[],
): Array<MessageGroup<T>> {
  const groups: Array<MessageGroup<T>> = [];
  let previous: T | null = null;

  for (const message of messages) {
    const sameDay = previous !== null && dayKey(previous.created_at) === dayKey(message.created_at);
    const continues =
      previous !== null &&
      sameDay &&
      previous.author_id === message.author_id &&
      new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 6 * MINUTE;

    if (continues) {
      groups[groups.length - 1]!.items.push(message);
    } else {
      groups.push({
        key: message.id,
        authorId: message.author_id,
        day: dayKey(message.created_at),
        items: [message],
      });
    }

    previous = message;
  }

  return groups;
}
