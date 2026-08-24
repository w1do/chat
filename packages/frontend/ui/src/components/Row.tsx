import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemeTokens } from '../styles/tokens';

interface RowProps {
  title: string;
  hint?: string;
  value?: string;
  onClick?: () => void;
  right?: ReactNode;
  theme: ThemeTokens;
  last?: boolean;
}

/** Строка списка: слева название, справа значение, шеврон или переключатель. */
export function Row({ title, hint, value, onClick, right, theme, last }: RowProps) {
  const content = (
    <>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px]" style={{ color: theme.text }}>
          {title}
        </span>
        {hint ? (
          <span className="block text-[13px] mt-0.5" style={{ color: theme.muted }}>
            {hint}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="text-[15px] shrink-0" style={{ color: theme.muted }}>
          {value}
        </span>
      ) : null}
      {right}
      {onClick && !right ? <ChevronRight size={17} style={{ color: theme.faint }} className="shrink-0" /> : null}
    </>
  );

  const style = {
    paddingTop: 13,
    paddingBottom: 13,
    borderBottom: last ? 'none' : `1px solid ${theme.hairline}`,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 text-left tap" style={style}>
        {content}
      </button>
    );
  }

  return (
    <div className="w-full flex items-center gap-3 px-4 text-left" style={style}>
      {content}
    </div>
  );
}
