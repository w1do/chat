// Вложения в панели ввода: выбор, загрузка, повтор и снятие до отправки.
//
// Файл уходит на сервер сразу после выбора (design 3): у каждого свой ход
// загрузки и своя ошибка, неудача одного не трогает остальные. Пределы
// повторяют серверные по умолчанию; сервер всё равно проверяет свои.

import { useEffect, useRef, useState } from 'react';
import { isApiError } from '@vendor/api-client';
import { attachmentsApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import type { Attachment } from '../schemas/message';

export const ATTACHMENT_MAX_FILES = 10;
export const ATTACHMENT_MAX_SIZE_MB = 25;

export interface PendingAttachment {
  localId: string;
  name: string;
  size: number;
  isImage: boolean;
  /** Локальный предпросмотр изображения до и во время загрузки. */
  previewUrl: string | null;
  status: 'uploading' | 'error' | 'ready';
  /** Ошибка этого файла; остальных она не касается. */
  error: string | null;
  /** Серверные данные, когда файл принят. */
  attachment: Attachment | null;
}

export interface AttachmentUploads {
  items: PendingAttachment[];
  /** Файлы, готовые к отправке: их идентификаторы уходят с сообщением. */
  readyIds: string[];
  uploading: boolean;
  add: (files: File[]) => void;
  remove: (localId: string) => void;
  retry: (localId: string) => void;
  clear: () => void;
}

export function useAttachmentUploads(roomId: string, onNotice?: (text: string) => void): AttachmentUploads {
  const client = useChatClient();
  const [items, setItems] = useState<PendingAttachment[]>([]);
  // File-объекты не нужны для отрисовки — живут вне состояния.
  const files = useRef(new Map<string, File>());

  const patch = (localId: string, changes: Partial<PendingAttachment>) => {
    setItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...changes } : item)));
  };

  const upload = async (localId: string, file: File) => {
    patch(localId, { status: 'uploading', error: null });
    try {
      const attachment = await attachmentsApi.upload(client, roomId, file);
      patch(localId, { status: 'ready', attachment });
    } catch (error) {
      patch(localId, { status: 'error', error: messageOf(error) });
    }
  };

  const add = (picked: File[]) => {
    setItems((current) => {
      const free = ATTACHMENT_MAX_FILES - current.length;

      if (picked.length > free) {
        // Лишние не прикладываются, человеку называют предел (spec).
        onNotice?.(`Не больше ${ATTACHMENT_MAX_FILES} файлов за один раз.`);
      }

      const accepted = picked.slice(0, Math.max(0, free)).map((file): PendingAttachment => {
        const localId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const isImage = file.type.startsWith('image/');
        const oversized = file.size > ATTACHMENT_MAX_SIZE_MB * 1024 * 1024;
        files.current.set(localId, file);

        if (!oversized) {
          void upload(localId, file);
        }

        return {
          localId,
          name: file.name,
          size: file.size,
          isImage,
          previewUrl: isImage ? previewUrlFor(file) : null,
          status: oversized ? 'error' : 'uploading',
          error: oversized ? `Файл больше ${ATTACHMENT_MAX_SIZE_MB} МБ.` : null,
          attachment: null,
        };
      });

      return [...current, ...accepted];
    });
  };

  const remove = (localId: string) => {
    setItems((current) => {
      const item = current.find((candidate) => candidate.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      files.current.delete(localId);

      return current.filter((candidate) => candidate.localId !== localId);
    });
  };

  const retry = (localId: string) => {
    const file = files.current.get(localId);
    if (!file) return;

    if (file.size > ATTACHMENT_MAX_SIZE_MB * 1024 * 1024) {
      patch(localId, { status: 'error', error: `Файл больше ${ATTACHMENT_MAX_SIZE_MB} МБ.` });

      return;
    }

    void upload(localId, file);
  };

  const clear = () => {
    setItems((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      files.current.clear();

      return [];
    });
  };

  // Смена комнаты — другой набор вложений; предпросмотры освобождаются.
  useEffect(() => clear, [roomId]);

  return {
    items,
    readyIds: items.flatMap((item) => (item.attachment ? [item.attachment.id] : [])),
    uploading: items.some((item) => item.status === 'uploading'),
    add,
    remove,
    retry,
    clear,
  };
}

/** Локальный предпросмотр; в средах без createObjectURL его просто нет. */
function previewUrlFor(file: File): string | null {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
}

function messageOf(error: unknown): string {
  // 422 несёт причину по полю файла: её и показываем человеку.
  if (isApiError(error)) {
    const errors = (error.envelope.details as { errors?: Record<string, string[]> }).errors;
    const first = errors?.file?.[0] ?? Object.values(errors ?? {})[0]?.[0];

    if (first) return first;
  }

  return 'Не удалось загрузить файл.';
}
