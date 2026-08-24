import type { ApiClient } from '@vendor/api-client';
import {
  notificationFeedSchema,
  preferenceSchema,
  type NotificationFeed,
  type NotificationPreference,
} from './schemas/notification';

export const notificationsApi = {
  async feed(client: ApiClient, unreadOnly = false): Promise<NotificationFeed> {
    return notificationFeedSchema.parse(
      await client.get('/notifications', { query: unreadOnly ? { unread: true } : {} }),
    );
  },
  async markRead(client: ApiClient, ids?: string[]): Promise<number> {
    const response = (await client.post('/notifications/read', {
      body: ids ? { ids } : {},
    })) as { data: { marked: number } };

    return response.data.marked;
  },
  async preferences(client: ApiClient): Promise<NotificationPreference[]> {
    const response = (await client.get('/notification-preferences')) as { data: unknown[] };

    return response.data.map((item) => preferenceSchema.parse(item));
  },
  async updatePreferences(
    client: ApiClient,
    preferences: Array<{ category: string; channel: string; enabled: boolean }>,
  ): Promise<NotificationPreference[]> {
    const response = (await client.patch('/notification-preferences', {
      body: { preferences },
    })) as { data: unknown[] };

    return response.data.map((item) => preferenceSchema.parse(item));
  },
};
