import { RADIUS, SPRING, type ThemeTokens } from '../styles/tokens';

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  theme: ThemeTokens;
  label: string;
}

/** Сегментированный переключатель (тема, размер текста). */
export function Segmented<T extends string>({ options, value, onChange, theme, label }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((option) => option.id === value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex p-1 w-full"
      style={{ background: theme.surfaceAlt, borderRadius: RADIUS.md }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: 4,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
          background: theme.surface,
          borderRadius: RADIUS.sm,
          boxShadow: '0 1px 3px rgba(20,19,26,.12)',
          transition: `transform .28s ${SPRING}`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          onClick={() => onChange(option.id)}
          className="relative z-10 flex-1 text-[13.5px] font-medium"
          style={{ padding: '7px 0', color: option.id === value ? theme.text : theme.muted, transition: 'color .2s' }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
