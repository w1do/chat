import { QueryClient } from '@tanstack/react-query';

// Единственный QueryClient приложения; feature-пакеты получают его через провайдер (§4.2).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 10_000 },
    },
  });
}
