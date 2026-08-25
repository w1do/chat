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

  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}

/**
 * «Печатает» человеческим языком: один — «печатает», двое и больше —
 * «печатают», длинный список сворачивается в «и ещё N».
 */
export function typingSummary(names: readonly string[], max = 3): string | null {
  if (names.length === 0) return null;

  const verb = names.length === 1 ? 'печатает' : 'печатают';

  if (names.length <= max) {
    const head = names.slice(0, -1).join(', ');
    const tail = names[names.length - 1]!;
    const list = names.length === 1 ? tail : `${head} и ${tail}`;

    return `${list} ${verb}…`;
  }

  const shown = names.slice(0, max).join(', ');

  return `${shown} и ещё ${names.length - max} ${verb}…`;
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

/** Лента: системные записи стоят отдельно, реплики группируются по автору. */
export type TimelineEntry<T> =
  | { type: 'system'; key: string; message: T }
  | { type: 'group'; key: string; group: MessageGroup<T> };

export function splitTimeline<
  T extends { id: string; author_id: string; created_at: string; kind: 'text' | 'system' },
>(messages: T[]): Array<TimelineEntry<T>> {
  const entries: Array<TimelineEntry<T>> = [];
  let buffer: T[] = [];

  const flush = () => {
    for (const group of buildGroups(buffer)) entries.push({ type: 'group', key: group.key, group });
    buffer = [];
  };

  for (const message of messages) {
    if (message.kind === 'system') {
      flush();
      entries.push({ type: 'system', key: message.id, message });
    } else {
      buffer.push(message);
    }
  }
  flush();

  return entries;
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

/** Индекс недоступен (503) — это не «ничего не найдено», а отдельное состояние. */
export function isSearchUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const status = (error as { status?: number }).status;

  return status === 503;
}

const GESTURE_HINT_KEY = 'chat:gesture-hint-seen';

/** Подсказку о жестах показываем один раз на устройство. */
export function readGestureHintSeen(): boolean {
  try {
    return window.localStorage.getItem(GESTURE_HINT_KEY) === '1';
  } catch {
    // Приватный режим или заблокированное хранилище — покажем подсказку снова.
    return false;
  }
}

export function rememberGestureHint(): void {
  try {
    window.localStorage.setItem(GESTURE_HINT_KEY, '1');
  } catch {
    // Ничего страшного: подсказка просто появится ещё раз.
  }
}
