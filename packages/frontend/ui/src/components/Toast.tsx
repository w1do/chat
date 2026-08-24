import { RADIUS, SPRING, type ThemeTokens } from '../styles/tokens';

/** Короткое сообщение поверх интерфейса. */
export function Toast({ text, theme, bottom = 100 }: { text: string | null; theme: ThemeTokens; bottom?: number }) {
  return (
    <div className="absolute left-0 right-0 flex justify-center px-6 z-50 pointer-events-none" style={{ bottom }}>
      <div
        role="status"
        aria-live="polite"
        className="px-4 py-2.5 text-[14px] text-center"
        style={{
          background: theme.text,
          color: theme.bg,
          borderRadius: RADIUS.md,
          maxWidth: 320,
          opacity: text ? 1 : 0,
          transform: text ? 'translateY(0) scale(1)' : 'translateY(10px) scale(.96)',
          transition: `all .3s ${SPRING}`,
        }}
      >
        {text ?? ''}
      </div>
    </div>
  );
}
