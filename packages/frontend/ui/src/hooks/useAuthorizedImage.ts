import { useEffect, useState } from 'react';

/**
 * Защищённые файлы (аватарки, фото комнат, миниатюры и оригиналы вложений)
 * браузер не умеет запрашивать сам: к `<img src>` он не приложит заголовок
 * авторизации. Поэтому картинка скачивается обычным `fetch` и показывается
 * из `blob:`-адреса (ADR-012).
 *
 * Адрес файла при этом не меняется, и запрос по-прежнему проходит через
 * service worker — кеш изображений на устройстве продолжает работать.
 */
type HeaderProvider = () => Record<string, string>;

/** Пока приложение не сказало иного, запрос уходит без заголовков. */
let headers: HeaderProvider = () => ({});

/**
 * Чем подписывать запрос за файлом. Задаёт приложение: дизайн-система не
 * знает ни про токен, ни про его хранилище (§4.2).
 */
export function setAuthorizedImageHeaders(provider: HeaderProvider): void {
  headers = provider;
}

export interface AuthorizedImageState {
  /** `blob:`-адрес готового изображения; null — ещё грузится или не вышло. */
  src: string | null;
  /** Запрос завершился отказом или ошибкой: повторов не будет. */
  failed: boolean;
}

interface Entry {
  refs: number;
  src: string | null;
  failed: boolean;
  loading: boolean;
  listeners: Set<() => void>;
}

/**
 * Общий реестр по адресу: одна и та же миниатюра в ленте и в списке
 * участников скачивается один раз.
 */
const registry = new Map<string, Entry>();

export function useAuthorizedImage(url: string | null | undefined): AuthorizedImageState {
  const [, rerender] = useState(0);
  const key = typeof url === 'string' && url !== '' ? url : null;

  useEffect(() => {
    if (key === null) return;

    const entry = acquire(key);
    const listener = () => rerender((tick) => tick + 1);
    entry.listeners.add(listener);

    if (entry.loading) {
      // Запрос уже идёт — дождёмся общего результата.
    } else if (entry.src !== null || entry.failed) {
      listener();
    } else {
      void load(key, entry);
    }

    return () => {
      entry.listeners.delete(listener);
      release(key);
    };
  }, [key]);

  const entry = key === null ? undefined : registry.get(key);

  return { src: entry?.src ?? null, failed: entry?.failed ?? false };
}

/**
 * Сохранение защищённого файла на устройство. Обычная ссылка `download` не
 * годится по той же причине, что и `<img src>`: заголовок авторизации браузер
 * к ней не приложит и вместо файла сохранится страница ошибки (ADR-012).
 */
export async function downloadAuthorizedFile(url: string, name: string): Promise<void> {
  const response = await fetch(url, { headers: headers() });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();

  // Отзыв откладывается на следующий тик: браузер к этому моменту уже забрал
  // данные, а мгновенный отзыв в части браузеров обрывает сохранение.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

/** Отзыв всех выданных `blob:`-адресов: нужен выходу и тестам. */
export function clearAuthorizedImages(): void {
  for (const entry of registry.values()) {
    if (entry.src !== null) URL.revokeObjectURL(entry.src);
  }
  registry.clear();
}

function acquire(key: string): Entry {
  const existing = registry.get(key);

  if (existing) {
    existing.refs += 1;

    return existing;
  }

  const entry: Entry = { refs: 1, src: null, failed: false, loading: false, listeners: new Set() };
  registry.set(key, entry);

  return entry;
}

function release(key: string): void {
  const entry = registry.get(key);
  if (!entry) return;

  entry.refs -= 1;
  if (entry.refs > 0) return;

  // Последний, кто показывал картинку, ушёл: адрес отзывается, иначе blob
  // остаётся в памяти вкладки до перезагрузки.
  registry.delete(key);
  if (entry.src !== null) URL.revokeObjectURL(entry.src);
}

async function load(key: string, entry: Entry): Promise<void> {
  entry.loading = true;

  try {
    const response = await fetch(key, { headers: headers() });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    entry.src = URL.createObjectURL(await response.blob());
  } catch {
    // Отказ, сеть или неготовый файл: на месте картинки — обычная замена, и
    // никаких повторов, иначе экран уходит в круг (spec).
    entry.failed = true;
  } finally {
    entry.loading = false;

    // Пока шёл запрос, последний потребитель мог уйти, а на его месте —
    // появиться новый со своей записью. Сверяем именно эту, иначе выданный
    // адрес остался бы в памяти вкладки навсегда.
    if (registry.get(key) !== entry && entry.src !== null) {
      URL.revokeObjectURL(entry.src);
      entry.src = null;
    }

    for (const listener of [...entry.listeners]) listener();
  }
}
