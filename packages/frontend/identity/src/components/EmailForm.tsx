import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { emailSchema, type EmailInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface EmailFormProps {
  theme: ThemeTokens;
  currentEmail: string | null;
  onSubmit: (input: EmailInput) => Promise<unknown>;
}

/** Почта необязательна: её добавляют, меняют или убирают в настройках. */
export function EmailForm({ theme, currentEmail, onSubmit }: EmailFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailInput>({ resolver: zodResolver(emailSchema), defaultValues: { email: currentEmail ?? '' } });

  const submit = handleSubmit(async (input) => {
    setSaved(false);
    setServerError(null);
    try {
      await onSubmit(input);
      setSaved(true);
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        const fieldErrors = (error.envelope.details as { errors?: Record<string, string[]> }).errors ?? {};
        if (fieldErrors.email) {
          setError('email', { message: 'Эта почта уже используется.' });

          return;
        }
      }
      setServerError('Не удалось сохранить почту.');
    }
  });

  return (
    <form onSubmit={submit} aria-label="email" noValidate className="flex flex-col gap-3">
      {serverError ? (
        <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-[13px]" style={{ color: theme.muted }}>
          Сохранено.
        </p>
      ) : null}
      <Field
        theme={theme}
        label="Почта"
        type="email"
        autoComplete="email"
        hint="Нужна только для восстановления пароля и писем. Оставьте поле пустым, чтобы убрать."
        error={errors.email?.message}
        {...register('email')}
      />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Сохранить почту
      </SubmitButton>
    </form>
  );
}
