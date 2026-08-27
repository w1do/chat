/**
 * Прогрев изображений: ближайшие миниатюры и картинки комнат подгружаются
 * заранее, чтобы при открытии переписки они уже лежали в кеше service
 * worker'а (spec platform/image-cache). Это обычный fetch из приложения — он
 * проходит через worker и попадает в тот же кеш, а без установленного
 * worker'а просто греет HTTP-кеш.
 */
import { useEffect } from 'react';

/** Больше трёх одновременных запросов начинают соперничать с живой лентой. */
export const PREWARM_CONCURRENCY = 3;

/** Уже отданные адреса: трафик человека не тратится на повтор. */
const requested = new Set<string>();
const queue: string[] = [];
let running = 0;
let scheduled = false;

export function prewarmImages(urls: readonly (string | null | undefined)[]): void {
  for (const url of urls) {
    if (typeof url !== 'string' || url === '' || requested.has(url)) continue;
    requested.add(url);
    queue.push(url);
  }

  schedule();
}

/**
 * Адреса из уже загруженных данных. Ключом эффекта служит сам список, поэтому
 * перерисовка ленты не превращается в новый прогрев.
 */
export function useImagePrewarm(urls: readonly (string | null | undefined)[]): void {
  const key = urls.filter((url): url is string => typeof url === 'string' && url !== '').join('\n');

  useEffect(() => {
    if (key === '') return;
    prewarmImages(key.split('\n'));
  }, [key]);
}

/** Прогрев ждёт простоя: живая переписка идёт первой (spec). */
function schedule(): void {
  if (scheduled || queue.length === 0) return;
  scheduled = true;

  onIdle(() => {
    scheduled = false;
    pump();
  });
}

function pump(): void {
  while (running < PREWARM_CONCURRENCY && queue.length > 0) {
    const url = queue.shift() as string;
    running += 1;

    void fetch(url, { credentials: 'include' })
      // Неудачный прогрев ничего не значит: адрес просто загрузится при показе.
      .catch(() => undefined)
      .finally(() => {
        running -= 1;
        pump();
      });
  }
}

function onIdle(run: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback;

  if (typeof idle === 'function') idle(run);
  else setTimeout(run, 300);
}

/** Сброс памяти прогрева — нужен тестам, чтобы соседний случай начинался с нуля. */
export function resetImagePrewarm(): void {
  requested.clear();
  queue.length = 0;
  running = 0;
  scheduled = false;
}
