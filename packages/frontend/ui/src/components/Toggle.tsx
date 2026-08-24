import { SPRING, type ThemeTokens } from '../styles/tokens';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  theme: ThemeTokens;
  label: string;
}

export function Toggle({ checked, onChange, theme, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative shrink-0 tap"
      style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        background: checked ? theme.text : theme.hairline,
        transition: `background .25s ${SPRING}`,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: 12,
          background: theme.surface,
          boxShadow: '0 1px 4px rgba(0,0,0,.22)',
          transition: `left .25s ${SPRING}`,
        }}
      />
    </button>
  );
}
