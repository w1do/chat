// Состояние входа SPA: один источник правды о том, годен ли токен.
//
// Живёт вне React намеренно: о 401 первым узнаёт ApiClient, который приложение
// создаёт до рендера (§4.2). Провайдер подписывается на те же изменения, а не
// заводит вторую копию состояния.

import { authToken } from './token';

export type SessionStatus = 'authorized' | 'unauthorized';

let status: SessionStatus = 'authorized';
let established = false;
const listeners = new Set<() => void>();

/** Экраны, доступные до входа: 401 там — обычное «человек не представился». */
const PUBLIC_PATHS = ['/auth/', '/invites/'];

export function sessionStatus(): SessionStatus {
  return status;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function set(next: SessionStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of [...listeners]) listener();
}

/**
 * Вход состоялся. Только с этого момента 401 означает «токен недействителен»:
 * до входа тот же ответ — обычное «человек не представился», и его разбирают
 * route guard и страница входа.
 */
export function markSessionEstablished(): void {
  established = true;
}

/**
 * Первый 401 переводит клиент в «вход недействителен»; следующие внутри того
 * же инцидента ничего не меняют. Отсюда и отсутствие мигания: сколько бы
 * запросов ни ответило 401 разом, состояние меняется единожды.
 *
 * @returns истина, если 401 разобран как недействительный вход.
 */
export function reportUnauthenticated(): boolean {
  if (!established) return false;
  set('unauthorized');

  return true;
}

/**
 * Защищённый запрос не уходит в сеть, пока представляться нечем: токена нет
 * вовсе или прежний признан недействительным. Иначе каждая перерисовка
 * порождает новый 401 и экран мигает. Публичные экраны работают как прежде.
 */
export function isRequestSuspended(path: string): boolean {
  if (PUBLIC_PATHS.some((prefix) => path.startsWith(prefix))) return false;

  return status === 'unauthorized' || authToken() === null;
}
