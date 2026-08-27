import type { ApiClient } from '@vendor/api-client';
import { createContext, useContext, type ReactNode } from 'react';

// ApiClient (и позже Echo) приходят от приложения через провайдер (§4.2).
const ChatApiContext = createContext<ApiClient | null>(null);

export function ChatProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ChatApiContext.Provider value={client}>{children}</ChatApiContext.Provider>;
}

export function useChatClient(): ApiClient {
  const client = useContext(ChatApiContext);
  if (!client) throw new Error('ChatProvider is missing above this component.');
  return client;
}

/**
 * Клиент там, где он необязателен: показывающий компонент рисуется и без
 * провайдера, а сам ходить в API начинает только когда приложение его дало.
 */
export function useOptionalChatClient(): ApiClient | null {
  return useContext(ChatApiContext);
}
