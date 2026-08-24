import type { ReactNode } from 'react';

// QueryClient, Echo, ErrorBoundary, тема и i18n собираются здесь и передаются
// feature-пакетам; пакеты не создают вторые экземпляры (§4.2).
// QueryClientProvider подключается на этапе 3 вместе с @tanstack/react-query.
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
