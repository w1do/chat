// Публичный entrypoint пакета @vendor/notifications.
export { notificationsApi } from './api';
export { NotificationFeed } from './components/NotificationFeed';
export { PreferencesForm } from './components/PreferencesForm';
export {
  NotificationsClientProvider,
  useMarkNotificationsRead,
  useNotificationFeed,
  useNotificationPreferences,
  useNotificationsClient,
  useUpdatePreferences,
} from './hooks/useNotifications';
export {
  notificationSchema,
  preferenceSchema,
  type Notification,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationFeed as NotificationFeedData,
  type NotificationPreference,
} from './schemas/notification';
