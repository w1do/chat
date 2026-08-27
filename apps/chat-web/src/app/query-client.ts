import { QueryClient } from '@tanstack/react-query';
import { UnauthenticatedError } from '@vendor/api-client';

/**
 * Повтор лечит сетевую икоту, но не истёкшую сессию: 401 повторится столько
 * раз, сколько ему позволят. Сессию восстанавливает AuthProvider — запросу
 * остаётся только упасть.
 */
function retryUnlessUnauthenticated(failureCount: number, error: unknown): boolean {
  return !(error instanceof UnauthenticatedError) && failureCount < 1;
}

// Единственный QueryClient приложения; feature-пакеты получают его через провайдер (§4.2).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: retryUnlessUnauthenticated, staleTime: 10_000 },
    },
  });
}
