import type { ReactNode } from 'react';
import { RADIUS, type ThemeTokens } from '../styles/tokens';

/** Карточка-группа строк с необязательным заголовком. */
export function Group({ children, theme, label }: { children: ReactNode; theme: ThemeTokens; label?: string }) {
  return (
    <section className="px-3 mb-5">
      {label ? (
        <h3 className="text-[12px] font-medium uppercase px-2 pb-2" style={{ color: theme.muted, letterSpacing: '0.07em' }}>
          {label}
        </h3>
      ) : null}
      <div style={{ background: theme.surface, borderRadius: RADIUS.md, overflow: 'hidden' }}>{children}</div>
    </section>
  );
}
