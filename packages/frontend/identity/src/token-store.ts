/**
 * Где лежит токен доступа, решает приложение (§4.2): в вебе это
 * `localStorage`, в мобильной оболочке — своё хранилище. Пакет знает только
 * контракт и не выбирает место сам.
 */
export interface AuthTokenStore {
  read(): string | null;
  save(token: string): void;
  clear(): void;
  /** Изменения значения, в том числе пришедшие из соседней вкладки. */
  subscribe?(listener: () => void): () => void;
}

/** До настройки приложением токен нигде не хранится. */
const NO_STORE: AuthTokenStore = {
  read: () => null,
  save: () => {},
  clear: () => {},
};

let store: AuthTokenStore = NO_STORE;

export function setAuthTokenStore(next: AuthTokenStore): void {
  store = next;
}

export function authTokenStore(): AuthTokenStore {
  return store;
}
