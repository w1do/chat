import { THEMES } from '@vendor/ui';
import { useEffect, useRef } from 'react';
import { useSettings } from '../app/settings';

interface SessionExpiredScreenProps {
  /** Выход и переход к форме входа. */
  onLogin: () => void;
  /** Перезагрузка страницы — на случай, если вход уже повторён в другой вкладке. */
  onReload: () => void;
  /** Выход уже начат: кнопки заблокированы, чтобы не нажать дважды. */
  busy: boolean;
}

/**
 * Экран «Сессия истекла»: перекрывает чат целиком и не закрывается.
 *
 * Закрывать нечего — пока вход не повторён, любое действие всё равно вернёт
 * 401. Поэтому ни крестика, ни закрытия по Escape: вместо мигающего чата
 * человек видит одно объяснение и одно понятное действие.
 */
export function SessionExpiredScreen({ onLogin, onReload, busy }: SessionExpiredScreenProps) {
  const panel = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const theme = THEMES[settings.theme];

  useEffect(() => {
    const buttons = () => [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
    buttons()[0]?.focus();

    // Фокус не уходит из окна: Tab ходит по кругу внутри него. Escape гасим
    // явно — иначе он закрыл бы что-нибудь под перекрытым экраном.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = buttons();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      const edge = event.shiftKey ? first : last;
      if (active === edge || !panel.current?.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-6 no-select"
      style={{ background: theme.name === 'dark' ? 'rgba(8,8,11,.82)' : 'rgba(20,19,26,.5)' }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-text"
        className="w-full max-w-sm outline-none"
        style={{
          background: theme.surface,
          color: theme.text,
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,.32)',
        }}
      >
        <h1 id="session-expired-title" className="text-[19px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Сессия истекла
        </h1>
        <p id="session-expired-text" className="text-[14px] mt-2" style={{ color: theme.muted }}>
          Вход больше не действует — чат не сможет отправлять и получать сообщения. Войдите снова, чтобы
          продолжить.
        </p>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onLogin}
            disabled={busy}
            className="tap w-full"
            style={{
              background: theme.own,
              color: theme.ownText,
              borderRadius: 14,
              minHeight: 44,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Выходим…' : 'Войти снова'}
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={busy}
            className="tap w-full"
            style={{
              background: theme.surfaceAlt,
              color: theme.text,
              borderRadius: 14,
              minHeight: 44,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Обновить страницу
          </button>
        </div>
      </div>
    </div>
  );
}
