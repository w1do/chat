import { NotificationFeed, useMarkNotificationsRead, useNotificationFeed } from '@vendor/notifications';
import { THEMES, useElementHeight, type ThemeTokens } from '@vendor/ui';
import { ChevronLeft } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../app/settings';

/** Экран «Уведомления»: что пропущено, пока чат был закрыт. */
export function NotificationsPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const theme: ThemeTokens = THEMES[settings.theme];
  const headerRef = useRef<HTMLElement>(null);
  const headerHeight = useElementHeight(headerRef);

  const feed = useNotificationFeed();
  const markRead = useMarkNotificationsRead();

  return (
    <div className="w-full flex justify-center" style={{ background: theme.bg, minHeight: '100dvh' }}>
      <main className="relative w-full max-w-md" style={{ color: theme.text }}>
        <header ref={headerRef} className="flex items-center gap-2 px-2 pb-3 safe-top">
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

        <div style={{ paddingTop: headerHeight > 0 ? 0 : undefined }}>
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
        </div>
      </main>
    </div>
  );
}
