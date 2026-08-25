import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { registerSchema, passwordHint, type RegisterInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface RegisterFormProps {
  theme: ThemeTokens;
  /** Минимальную длину пароля, заданную установкой, передаёт приложение. */
  passwordMinLength: number;
  /** Логин, введённый на соседней вкладке формы: не теряется при переключении. */
  defaultLogin?: string;
  /** Каждое изменение логина уходит наверх — им делятся вход и регистрация. */
  onLoginChange?: (login: string) => void;
  onSubmit: (input: RegisterInput) => Promise<unknown>;
}

/** Регистрация: придумал логин и пароль — уже внутри. Почта — потом, в настройках. */
export function RegisterForm({ theme, passwordMinLength, defaultLogin = '', onLoginChange, onSubmit }: RegisterFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema(passwordMinLength)),
    defaultValues: { login: defaultLogin } as Partial<RegisterInput>,
  });

  const submit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await onSubmit(input);
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        const fieldErrors = (error.envelope.details as { errors?: Record<string, string[]> }).errors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (field === 'login' || field === 'password') setError(field, { message: messages[0] });
        }
      } else {
        setServerError('Не удалось зарегистрироваться. Попробуйте ещё раз.');
      }
    }
  });

  return (
    <form onSubmit={submit} aria-label="register" noValidate className="flex flex-col gap-3">
      {serverError ? (
        <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
          {serverError}
        </p>
      ) : null}
      <Field
        theme={theme}
        label="Логин"
        hint="Латиница, цифры, точка, дефис или подчёркивание"
        autoComplete="username"
        autoCapitalize="none"
        error={errors.login?.message}
        {...register('login', { onChange: (event) => onLoginChange?.(event.target.value) })}
      />
      <Field
        theme={theme}
        label="Пароль"
        type="password"
        autoComplete="new-password"
        hint={passwordHint(passwordMinLength)}
        error={errors.password?.message}
        {...register('password')}
      />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Создать аккаунт
      </SubmitButton>
      <p className="text-[12.5px]" style={{ color: theme.faint }}>
        Почта не нужна для входа — её можно добавить позже в настройках.
      </p>
    </form>
  );
}
