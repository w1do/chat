// Обёртка над fetch для API: единый error envelope, trace_id,
// спец-обработка 401/429. Приложение создаёт один клиент и передаёт
// его feature-пакетам (§4.2); baseUrl приходит из runtime-конфига.

import {
  ApiError,
  type ApiErrorEnvelope,
  NetworkError,
  RateLimitedError,
  UnauthenticatedError,
} from './errors';

export interface ApiClientOptions {
  baseUrl: string;
  /**
   * Токен доступа текущего клиента (ADR-012). Геттер, а не значение: после
   * повторного входа запросы обязаны уходить с новым токеном, а хранилище
   * принадлежит приложению.
   */
  authToken?: () => string | null;
  /** Хук на 401 — например, редирект на страницу входа. */
  onUnauthenticated?: () => void;
  /**
   * Приложение сообщает, что представляться нечем и защищённый запрос
   * отправлять бессмысленно. Такой запрос не уходит в сеть: иначе каждая
   * перерисовка порождает новый 401, а с ним — повторы и мигание интерфейса.
   */
  sessionSuspended?: (path: string) => boolean;
  fetchFn?: typeof fetch;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Ключ идемпотентности для повторяемых опасных мутаций. */
  idempotencyKey?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  get(path: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request('GET', path, options);
  }

  post(path: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request('POST', path, options);
  }

  patch(path: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request('PATCH', path, options);
  }

  delete(path: string, options: RequestOptions = {}): Promise<unknown> {
    return this.request('DELETE', path, options);
  }

  /**
   * Заголовки авторизованного запроса. Нужны и тем, кто ходит мимо клиента:
   * загрузке защищённых картинок и авторизации канала real-time.
   */
  authHeaders(): Record<string, string> {
    const token = this.options.authToken?.() ?? null;

    return token === null ? {} : { Authorization: `Bearer ${token}` };
  }

  absoluteUrl(path: string): string {
    return new URL(this.options.baseUrl + path, origin()).toString();
  }

  async request(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
    // Представляться нечем: запрос обрывается здесь, до сети.
    if (this.options.sessionSuspended?.(path)) {
      throw new UnauthenticatedError(401, {
        code: 'unauthenticated',
        message: 'Unauthenticated',
        details: {},
        trace_id: null,
      });
    }

    const url = new URL(this.options.baseUrl + path, origin());
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...this.authHeaders(),
      ...options.headers,
    };
    // FormData несёт свою границу multipart: заголовок ставит сам браузер,
    // а заданный вручную сломал бы разбор файла на сервере.
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const fetchFn = this.options.fetchFn ?? fetch;
    let response: Response;
    try {
      response = await fetchFn(url.toString(), {
        method,
        headers,
        body: options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (response.status === 204) return undefined;

    if (response.ok) {
      return (await response.json()) as unknown;
    }

    const envelope = await parseEnvelope(response);

    if (response.status === 401) {
      this.options.onUnauthenticated?.();
      throw new UnauthenticatedError(response.status, envelope);
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitedError(
        response.status,
        envelope,
        retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null,
      );
    }

    throw new ApiError(response.status, envelope);
  }
}

async function parseEnvelope(response: Response): Promise<ApiErrorEnvelope> {
  const traceId = response.headers.get('X-Trace-Id');
  try {
    const body = (await response.json()) as Partial<ApiErrorEnvelope>;
    return {
      code: typeof body.code === 'string' ? body.code : 'http_error',
      message: typeof body.message === 'string' ? body.message : response.statusText,
      details: typeof body.details === 'object' && body.details !== null ? body.details : {},
      trace_id: typeof body.trace_id === 'string' ? body.trace_id : traceId,
    };
  } catch {
    return { code: 'http_error', message: response.statusText, details: {}, trace_id: traceId };
  }
}

function origin(): string {
  return globalThis.location?.origin ?? 'http://localhost';
}
