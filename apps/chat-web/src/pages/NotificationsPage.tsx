import { NotificationFeed, useMarkNotificationsRead, useNotificationFeed } from '@vendor/notifications';
import { Screen, THEMES, type ThemeTokens } from '@vendor/ui';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../app/settings';

/** Экран «Уведомления»: что пропущено, пока чат был закрыт. */
export function NotificationsPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const theme: ThemeTokens = THEMES[settings.theme];

  const feed = useNotificationFeed();
  const markRead = useMarkNotificationsRead();

  return (
    // Страница не прокручивается: прокручивается лента внутри Screen.
    <div className="h-full w-full flex justify-center" style={{ background: theme.bg }}>
      <main className="relative h-full w-full max-w-md" style={{ color: theme.text }}>
        <Screen
          theme={theme}
          contentStyle={{ paddingTop: 8, paddingBottom: 24 }}
          header={
            <header className="flex items-center gap-2 px-2 pb-3 safe-top">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Назад"
            className="tap grid place-items-center"
            style={{ width: 34, height: 34, color: theme.text }}
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
            Уведомления
          </h1>
            </header>
          }
        >
          <NotificationFeed
            notifications={feed.data?.data}
            unread={feed.data?.meta.unread ?? 0}
            isLoading={feed.isLoading}
            error={feed.error ?? undefined}
            theme={theme}
            onOpenRoom={(roomId) => navigate(`/rooms/${roomId}`)}
            onMarkAllRead={() => markRead.mutate(undefined)}
            onRetry={() => void feed.refetch()}
          />
        </Screen>
      </main>
    </div>
  );
}
