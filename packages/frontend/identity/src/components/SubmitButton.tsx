import { RADIUS, type ThemeTokens } from '@vendor/ui';
import type { ReactNode } from 'react';

export function SubmitButton({
  theme,
  busy,
  children,
}: {
  theme: ThemeTokens;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-3.5 tap text-[16px] font-medium"
      style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.md, opacity: busy ? 0.7 : 1 }}
    >
      {children}
    </button>
  );
}
