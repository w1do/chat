import { RADIUS, type ThemeTokens } from '@vendor/ui';
import type { Notification } from '../schemas/notification';

interface NotificationFeedProps {
  notifications: Notification[] | undefined;
  unread: number;
  isLoading: boolean;
  error?: unknown;
  theme: ThemeTokens;
  onOpenRoom: (roomId: string) => void;
  onMarkAllRead: () => void;
  onRetry: () => void;
}

const CATEGORY_LABEL: Record<Notification['category'], string> = {
  message: 'Сообщения',
  mention: 'Упоминание',
  room_invite: 'Приглашение',
  security: 'Безопасность',
};

/** Лента уведомлений: свёрнутые события показывают счётчик. */
export function NotificationFeed({
  notifications,
  unread,
  isLoading,
  error,
  theme,
  onOpenRoom,
  onMarkAllRead,
  onRetry,
}: NotificationFeedProps) {
  if (isLoading) {
    return (
      <p aria-busy="true" className="px-4 py-6 text-[15px]" style={{ color: theme.muted }}>
        Загрузка уведомлений…
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="px-4 py-6">
        <p className="text-[15px]" style={{ color: theme.text }}>
          Не удалось загрузить уведомления.
        </p>
        <button type="button" onClick={onRetry} className="mt-2 text-[15px] tap" style={{ color: theme.amberText }}>
          Повторить
        </button>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <p role="status" className="px-4 py-6 text-[15px]" style={{ color: theme.muted }}>
        Пока ничего не пропущено.
      </p>
    );
  }

  return (
    <section aria-label="Уведомления">
      {unread > 0 ? (
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-[13px]" style={{ color: theme.muted }}>
            Непрочитанных: {unread}
          </span>
          <button type="button" onClick={onMarkAllRead} className="text-[13px] tap" style={{ color: theme.amberText }}>
            Отметить всё прочитанным
          </button>
        </div>
      ) : null}

      <ul className="px-3">
        {notifications.map((notification) => (
          <li key={notification.id} className="mb-2">
            <button
              type="button"
              disabled={notification.room_id === null}
              onClick={() => notification.room_id && onOpenRoom(notification.room_id)}
              className="w-full text-left px-3 py-2.5 tap"
              style={{
                background: theme.surface,
                borderRadius: RADIUS.md,
                opacity: notification.read_at === null ? 1 : 0.6,
                boxShadow: notification.read_at === null ? `inset 3px 0 0 ${theme.amber}` : 'none',
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-[12px] uppercase" style={{ color: theme.faint, letterSpacing: '0.06em' }}>
                  {CATEGORY_LABEL[notification.category]}
                </span>
                {notification.group_count > 1 ? (
                  <span
                    aria-label={`Свёрнуто событий: ${notification.group_count}`}
                    className="text-[11.5px] px-1.5"
                    style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: 8 }}
                  >
                    ×{notification.group_count}
                  </span>
                ) : null}
              </span>
              <span className="block text-[16px] mt-0.5" style={{ color: theme.text }}>
                {notification.room_name ?? 'Чат'}
              </span>
              <span className="block text-[14px] mt-0.5 truncate" style={{ color: theme.muted }}>
                {notification.actor_name ? `${notification.actor_name}: ` : ''}
                {notification.preview}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
