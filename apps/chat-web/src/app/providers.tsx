import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient } from './query-client';

const queryClient = createQueryClient();

// QueryClient, Echo, ErrorBoundary, тема и i18n собираются здесь и передаются
// feature-пакетам; пакеты не создают вторые экземпляры (§4.2).
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
