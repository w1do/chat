import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type InputHTMLAttributes, type Ref } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** React 19 передаёт ref обычным пропом — принимаем его явно, чтобы не потерять. */
  ref?: Ref<HTMLInputElement>;
  label: string;
  hint?: string;
  error?: string;
  theme: ThemeTokens;
  /** Поле пароля: получает переключатель показа введённого текста. */
  revealable?: boolean;
}

/** Поле формы в оформлении дизайн-системы (design 1a). */
export function Field({
  label,
  hint,
  error,
  theme,
  revealable = false,
  // type разбираем отдельно: он приходит и от формы, поэтому в спреде затёр бы
  // вычисленный здесь. На input он ставится ПОСЛЕ inputProps.
  type = 'text',
  ref,
  ...inputProps
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  // Ссылку на поле держим и мы, и react-hook-form: свой ref, поставленный
  // рядом со спредом, затёр бы чужой — и форма отправляла бы пустое значение.
  const attachRef = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      applyRef(ref, node);
    },
    [ref],
  );

  // Браузер решает, предлагать ли сохранить пароль, по наличию поля-пароля в
  // момент отправки. setState к этому моменту не успевает, поэтому возвращаем
  // тип синхронно, в фазе перехвата, — и только потом догоняем состоянием.
  useEffect(() => {
    if (!revealable) return;

    const form = input.current?.form;
    if (!form) return;

    const hide = () => {
      if (input.current) input.current.type = 'password';
      setShown(false);
    };

    form.addEventListener('submit', hide, true);

    return () => form.removeEventListener('submit', hide, true);
  }, [revealable]);

  const toggle = () => {
    const node = input.current;
    const next = !shown;

    // Тип меняем императивно и тут же возвращаем каретку — WebKit и Blink
    // уводят её в конец. Асинхронное восстановление здесь недопустимо: оно
    // догонит человека, когда он уже печатает, и перемешает ввод.
    if (node) {
      const caret = node.selectionStart;

      node.type = next ? 'text' : 'password';
      node.focus();

      if (caret !== null) {
        try {
          node.setSelectionRange(caret, caret);
        } catch {
          // Поле уже не принимает выделение — терять из-за этого ввод незачем.
        }
      }
    }

    // Состояние догоняет DOM: React отрендерит тот же тип, узел не пересоздаётся.
    setShown(next);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium mb-1.5" style={{ color: theme.muted }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full py-3 outline-none field-focus"
          style={{
            background: theme.surfaceAlt,
            borderRadius: RADIUS.md,
            color: theme.text,
            fontSize: 16,
            paddingLeft: 14,
            // Запас справа под кнопку: иначе длинный открытый пароль уезжает под неё.
            paddingRight: revealable ? 44 : 14,
            // Рамка ошибки. Рамку фокуса рисует .field-focus:focus-visible через
            // outline — инлайн его не перебивает, поэтому обе видны разом.
            ...(error ? { boxShadow: `inset 0 0 0 1.5px ${theme.danger}` } : {}),
          }}
          {...inputProps}
          type={revealable && shown ? 'text' : type}
          ref={attachRef}
        />
        {revealable ? (
          <button
            type="button"
            onClick={toggle}
            // Клик отбирает фокус у поля, а на телефоне это схлопывает клавиатуру.
            onMouseDown={(event) => event.preventDefault()}
            aria-pressed={shown}
            aria-label={`${shown ? 'Скрыть' : 'Показать'} пароль: ${label}`}
            className="tap absolute grid place-items-center"
            style={{
              width: 30,
              height: 30,
              right: 7,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 15,
              color: theme.muted,
            }}
          >
            {shown ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </div>
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

/** React 19 отдаёт ref обычным пропом: он может быть и функцией, и объектом. */
function applyRef(ref: Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null): void {
  if (typeof ref === 'function') {
    ref(node);

    return;
  }

  if (ref) (ref as { current: HTMLInputElement | null }).current = node;
}
