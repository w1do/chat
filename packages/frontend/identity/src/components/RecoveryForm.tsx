import { zodResolver } from '@hookform/resolvers/zod';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface RecoveryFormProps {
  theme: ThemeTokens;
  onSubmit: (input: ForgotPasswordInput) => Promise<unknown>;
}

export function RecoveryForm({ theme, onSubmit }: RecoveryFormProps) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const submit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await onSubmit(input);
      setSent(true);
    } catch {
      setServerError('Не удалось отправить письмо. Попробуйте ещё раз.');
    }
  });

  if (sent) {
    return (
      <p role="status" className="text-[14px]" style={{ color: theme.muted }}>
        Если к аккаунту привязана эта почта, мы отправили ссылку для восстановления. Восстановление
        работает только для аккаунтов с указанной почтой — её добавляют в настройках.
      </p>
    );
  }

  return (
    <form onSubmit={submit} aria-label="password-recovery" noValidate className="flex flex-col gap-3">
      {serverError ? (
        <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
          {serverError}
        </p>
      ) : null}
      <Field
        theme={theme}
        label="Почта"
        type="email"
        autoComplete="email"
        hint="Восстановление доступно, только если почта указана в настройках"
        error={errors.email?.message}
        {...register('email')}
      />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Отправить ссылку
      </SubmitButton>
    </form>
  );
}
