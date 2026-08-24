import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@vendor/api-client';
import { createContext, useContext } from 'react';
import { notificationsApi } from '../api';

const FEED_KEY = ['notifications', 'feed'] as const;
const PREFERENCES_KEY = ['notifications', 'preferences'] as const;

/** ApiClient приходит от приложения (§4.2). */
const ClientContext = createContext<ApiClient | null>(null);

export const NotificationsClientProvider = ClientContext.Provider;

export function useNotificationsClient(): ApiClient {
  const client = useContext(ClientContext);
  if (!client) throw new Error('NotificationsClientProvider is missing above this component.');

  return client;
}

export function useNotificationFeed(unreadOnly = false) {
  const client = useNotificationsClient();

  return useQuery({
    queryKey: [...FEED_KEY, { unreadOnly }],
    queryFn: () => notificationsApi.feed(client, unreadOnly),
  });
}

export function useMarkNotificationsRead() {
  const client = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(client, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useNotificationPreferences() {
  const client = useNotificationsClient();

  return useQuery({ queryKey: PREFERENCES_KEY, queryFn: () => notificationsApi.preferences(client) });
}

export function useUpdatePreferences() {
  const client = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Array<{ category: string; channel: string; enabled: boolean }>) =>
      notificationsApi.updatePreferences(client, preferences),
    onSuccess: (data) => queryClient.setQueryData(PREFERENCES_KEY, data),
  });
}
