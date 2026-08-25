import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { passwordChangeSchema, passwordHint, type PasswordChangeInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface PasswordFormProps {
  theme: ThemeTokens;
  /** Минимальная длина пароля, заданную установкой передаёт приложение. */
  passwordMinLength: number;
  onSubmit: (input: PasswordChangeInput) => Promise<unknown>;
}

export function PasswordForm({ theme, passwordMinLength, onSubmit }: PasswordFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema(passwordMinLength)) });

  const submit = handleSubmit(async (input) => {
    setSaved(false);
    setServerError(null);
    try {
      await onSubmit(input);
      setSaved(true);
      reset();
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        setError('current_password', { message: 'Текущий пароль указан неверно.' });

        return;
      }
      setServerError('Не удалось изменить пароль.');
    }
  });

  return (
    <form onSubmit={submit} aria-label="password" noValidate className="flex flex-col gap-3">
      {serverError ? (
        <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-[13px]" style={{ color: theme.muted }}>
          Пароль изменён.
        </p>
      ) : null}
      <Field
        theme={theme}
        label="Текущий пароль"
        type="password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <Field
        theme={theme}
        label="Новый пароль"
        type="password"
        autoComplete="new-password"
        hint={passwordHint(passwordMinLength)}
        error={errors.password?.message}
        {...register('password')}
      />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Изменить пароль
      </SubmitButton>
    </form>
  );
}
