/**
 * Токен доступа — единственное, чем клиент представляется серверу (ADR-012).
 * Значением владеет приложение, а не пакеты: `@vendor/api-client` остаётся
 * переиспользуемым (§4.2), а мобильная оболочка хранит токен иначе.
 */
const STORAGE_KEY = 'chat.auth-token';

/**
 * Копия в памяти — не кеш, а запасное хранилище: приватный режим и запрет
 * политики отнимают `localStorage`, но не должны отнимать работу в уже
 * открытой вкладке (spec identity/token-authentication).
 */
let token: string | null = readStorage();
const listeners = new Set<() => void>();

export function authToken(): string | null {
  return token;
}

export function storeAuthToken(value: string): void {
  set(value);

  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Записать некуда — вход живёт до закрытия вкладки, и это честнее, чем
    // не пустить человека в чат вовсе.
  }
}

export function clearAuthToken(): void {
  set(null);

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Хранилища нет — стирать нечего.
  }
}

/** Изменения значения, включая приход из соседней вкладки. */
export function subscribeAuthToken(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function set(next: string | null): void {
  if (token === next) return;
  token = next;
  for (const listener of [...listeners]) listener();
}

function readStorage(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    return value !== null && value !== '' ? value : null;
  } catch {
    return null;
  }
}

// Событие `storage` приходит только в соседние вкладки: выход в одной гасит
// остальные без опроса сервера. `key === null` — вкладку очистили целиком.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    set(readStorage());
  });
}
