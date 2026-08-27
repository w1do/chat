// Состояние сессии SPA: один источник правды о том, жив ли вход.
//
// Живёт вне React намеренно: о 401 первым узнаёт ApiClient, который приложение
// создаёт до рендера (§4.2). Провайдер подписывается на те же изменения, а не
// заводит вторую копию состояния.

export type SessionStatus = 'authorized' | 'recovering' | 'unauthorized';

/** Тихое восстановление: истина — сессия снова жива. */
type Recovery = () => Promise<boolean>;

let status: SessionStatus = 'authorized';
let established = false;
let recovery: Recovery | null = null;
const listeners = new Set<() => void>();

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
 * Вход состоялся. Только с этого момента 401 означает «сессия истекла»:
 * до входа тот же ответ — обычное «человек не представился», и его разбирают
 * route guard и страница входа.
 */
export function markSessionEstablished(): void {
  established = true;
}

/** Попытка тихого восстановления; null — восстановление выключено установкой. */
export function setSilentRecovery(attempt: Recovery | null): void {
  recovery = attempt;
}

/**
 * Первый 401 открывает инцидент; следующие внутри него ничего не меняют.
 * Отсюда и «ровно одна попытка восстановления», и отсутствие мигания: сколько
 * бы запросов ни ответило 401 разом, состояние меняется единожды.
 *
 * @returns истина, если 401 разобран как истёкшая сессия.
 */
export function reportUnauthenticated(): boolean {
  if (!established) return false;
  if (status !== 'authorized') return true;

  const attempt = recovery;
  if (!attempt) {
    set('unauthorized');

    return true;
  }

  set('recovering');
  attempt().then(
    (restored) => set(restored ? 'authorized' : 'unauthorized'),
    () => set('unauthorized'),
  );

  return true;
}

/** Сессия снова жива: инцидент закрыт, приложение работает обычным образом. */
export function restoreSession(): void {
  established = true;
  set('authorized');
}

/**
 * Пока инцидент открыт, защищённые запросы не уходят в сеть: иначе каждая
 * перерисовка порождает новый 401 и экран мигает. Вход и выход пропускаются
 * всегда — ими пользуется сам экран «Сессия истекла»; `/me` нужен проверке
 * восстановления.
 */
export function isRequestSuspended(path: string): boolean {
  if (status === 'authorized') return false;
  if (path.startsWith('/auth/')) return false;

  return !(status === 'recovering' && path === '/me');
}
