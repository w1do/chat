import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { useId, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  theme: ThemeTokens;
}

/** Поле формы в оформлении дизайн-системы (design 1a). */
export function Field({ label, hint, error, theme, ...inputProps }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] mb-1" style={{ color: theme.muted }}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full px-3 py-2.5 outline-none"
        style={{
          background: theme.surfaceAlt,
          borderRadius: RADIUS.sm,
          color: theme.text,
          fontSize: 16,
          boxShadow: error ? `inset 0 0 0 1.5px ${theme.danger}` : 'none',
        }}
        {...inputProps}
      />
      {hint && !error ? (
        <p className="text-[12.5px] mt-1" style={{ color: theme.faint }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[12.5px] mt-1" style={{ color: theme.danger }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
