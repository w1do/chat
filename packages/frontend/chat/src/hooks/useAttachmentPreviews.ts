import { useEffect, useMemo, useState } from 'react';
import { useOptionalChatClient } from '../adapters/ChatProvider';
import { messagesApi } from '../api';
import type { Attachment } from '../schemas/message';

/**
 * Паузы перед догоняющими запросами миниатюры, мс. Длина массива — и есть
 * число попыток: конверсия может не появиться никогда (битый файл, упавший
 * воркер), поэтому опрос конечный (design 2). Паузы растут, чтобы десять
 * плиток одного сообщения не били по серверу синхронно.
 */
export const PREVIEW_RETRY_DELAYS = [2000, 5000, 12000] as const;

export interface AttachmentPreviews {
  /** Вложения, где неготовые миниатюры заменены доехавшими. */
  attachments: Attachment[];
  /** Попытки исчерпаны: миниатюры не будет, остаётся открыть оригинал. */
  givenUp: boolean;
}

const isImage = (attachment: Attachment): boolean => attachment.mime_type.startsWith('image/');

/**
 * Догоняющий запрос миниатюры: пока у изображения нет `thumb_url`, сообщение
 * перечитывается ограниченным числом раз с возрастающими паузами. Хук живёт
 * на сообщении, а не на плитке, поэтому запрос идёт один независимо от числа
 * изображений в нём.
 */
export function useAttachmentPreviews(messageId: string, attachments: Attachment[]): AttachmentPreviews {
  const client = useOptionalChatClient();
  const [caught, setCaught] = useState<ReadonlyMap<string, Attachment>>(EMPTY);
  const [givenUp, setGivenUp] = useState(false);

  // Новое сообщение в той же плитке — счёт попыток начинается заново.
  useEffect(() => {
    setCaught(EMPTY);
    setGivenUp(false);
  }, [messageId]);

  const resolved = useMemo(
    () => attachments.map((attachment) => caught.get(attachment.id) ?? attachment),
    [attachments, caught],
  );

  const waiting = resolved.some((attachment) => isImage(attachment) && attachment.thumb_url === null);

  useEffect(() => {
    if (client === null || !waiting || givenUp) return;

    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = (): void => {
      timer = setTimeout(() => {
        void messagesApi
          .get(client, messageId)
          .then((message) => {
            if (cancelled) return;
            // Набор вложений задаёт лента; догоняем только адреса миниатюр.
            const fresh = new Map(message.attachments.map((item) => [item.id, item]));
            setCaught((current) => {
              const merged = new Map(current);
              for (const [id, item] of fresh) {
                if (item.thumb_url !== null) merged.set(id, item);
              }

              return merged;
            });
          })
          // Неудачная попытка тратится так же, как и пустая: без неё серия
          // при недоступном сервере превратилась бы в бесконечную.
          .catch(() => undefined)
          .finally(() => {
            if (cancelled) return;
            attempt += 1;
            if (attempt >= PREVIEW_RETRY_DELAYS.length) setGivenUp(true);
            else ask();
          });
      }, PREVIEW_RETRY_DELAYS[attempt]);
    };

    ask();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [client, messageId, waiting, givenUp]);

  return { attachments: resolved, givenUp };
}

const EMPTY: ReadonlyMap<string, Attachment> = new Map();
