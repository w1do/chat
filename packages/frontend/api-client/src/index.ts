// Публичный entrypoint @vendor/api-client.
export { ApiClient, type ApiClientOptions, type RequestOptions } from './client';
export {
  ApiError,
  type ApiErrorEnvelope,
  CsrfTokenMismatchError,
  isApiError,
  NetworkError,
  RateLimitedError,
  UnauthenticatedError,
} from './errors';
export type { components, paths } from './generated/schema';
