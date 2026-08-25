import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface LoginFormProps {
  theme: ThemeTokens;
  /** Логин, введённый на соседней вкладке формы: не теряется при переключении. */
  defaultLogin?: string;
  /** Каждое изменение логина уходит наверх — им делятся вход и регистрация. */
  onLoginChange?: (login: string) => void;
  onSubmit: (input: LoginInput) => Promise<unknown>;
}

/** Вход по логину: два поля и кнопка (design 1b). */
export function LoginForm({ theme, defaultLogin = '', onLoginChange, onSubmit }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: defaultLogin } as Partial<LoginInput>,
  });

  const submit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await onSubmit(input);
    } catch (error) {
      setServerError(
        isApiError(error) && error.status === 401
          ? 'Неверный логин или пароль.'
          : 'Не удалось выполнить вход. Попробуйте ещё раз.',
      );
    }
  });

  return (
    <form onSubmit={submit} aria-label="login" noValidate className="flex flex-col gap-3">
      {serverError ? (
        <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
          {serverError}
        </p>
      ) : null}
      <Field
        theme={theme}
        label="Логин"
        autoComplete="username"
        autoCapitalize="none"
        error={errors.login?.message}
        {...register('login', { onChange: (event) => onLoginChange?.(event.target.value) })}
      />
      <Field
        theme={theme}
        label="Пароль"
        type="password"
        revealable
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Войти
      </SubmitButton>
    </form>
  );
}
