import type { CSSProperties, ReactNode } from 'react';
import type { ThemeTokens } from '../styles/tokens';

interface ScreenProps {
  /** Закреплённая шапка: не уезжает при прокрутке содержимого. */
  header?: ReactNode;
  /** Закреплённый низ: панель ввода, навигация. Необязателен. */
  footer?: ReactNode;
  children: ReactNode;
  theme: ThemeTokens;
  /** Ссылка на прокручиваемую середину — нужна автопрокрутке ленты. */
  contentRef?: React.Ref<HTMLDivElement>;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/**
 * Экран приложения: закреплённые края и одна прокручиваемая середина.
 *
 * `minmax(0, 1fr)` здесь не косметика: без него середина не сжимается ниже
 * своего содержимого и распирает экран — именно так появляется прокрутка всей
 * страницы вместо прокрутки содержимого.
 */
export function Screen({
  header,
  footer,
  children,
  theme,
  contentRef,
  contentClassName = '',
  contentStyle,
  className = '',
  style,
  'aria-label': ariaLabel,
}: ScreenProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={`grid h-full w-full ${className}`}
      style={{
        gridTemplateRows: `auto minmax(0, 1fr) auto`,
        background: theme.bg,
        color: theme.text,
        overflow: 'hidden',
        ...style,
      }}
    >
      {header ?? <div />}

      <div
        ref={contentRef}
        className={`min-h-0 overflow-y-auto scroll-area ${contentClassName}`}
        style={contentStyle}
      >
        {children}
      </div>

      {footer ?? <div />}
    </div>
  );
}
