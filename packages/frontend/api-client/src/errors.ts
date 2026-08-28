// Типизированные ошибки API: контракт единого error envelope
// (docs/api/error-envelope.md).

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details: Record<string, unknown>;
  trace_id: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly envelope: ApiErrorEnvelope,
  ) {
    super(envelope.message);
    this.name = 'ApiError';
  }

  get code(): string {
    return this.envelope.code;
  }

  get traceId(): string | null {
    return this.envelope.trace_id;
  }
}

/** 401 — токена нет или он отозван: приложение уводит на вход. */
export class UnauthenticatedError extends ApiError {}

/** 429 — rate limit: повтор не раньше retryAfterSeconds. */
export class RateLimitedError extends ApiError {
  constructor(
    status: number,
    envelope: ApiErrorEnvelope,
    public readonly retryAfterSeconds: number | null,
  ) {
    super(status, envelope);
    this.name = 'RateLimitedError';
  }
}

/** Сеть/недоступность сервера — ответа с envelope не было. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
