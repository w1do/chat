import { QueryClientProvider } from '@tanstack/react-query';
import { ChatProvider } from '@vendor/chat';
import { IdentityProvider } from '@vendor/identity';
import { NotificationsClientProvider } from '@vendor/notifications';
import type { ReactNode } from 'react';
import { apiClient } from './api';
import { createQueryClient } from './query-client';

const queryClient = createQueryClient();

// QueryClient, ApiClient, Echo, ErrorBoundary, тема и i18n собираются здесь и
// передаются feature-пакетам; пакеты не создают вторые экземпляры (§4.2).
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <IdentityProvider client={apiClient()}>
        <ChatProvider client={apiClient()}>
          <NotificationsClientProvider value={apiClient()}>{children}</NotificationsClientProvider>
        </ChatProvider>
      </IdentityProvider>
    </QueryClientProvider>
  );
}
