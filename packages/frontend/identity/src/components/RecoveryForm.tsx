import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/auth';
import { FormField } from './FormField';

interface RecoveryFormProps {
  onSubmit: (input: ForgotPasswordInput) => Promise<unknown>;
}

export function RecoveryForm({ onSubmit }: RecoveryFormProps) {
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
    return <p role="status">Если такой email зарегистрирован, мы отправили ссылку для восстановления.</p>;
  }

  return (
    <form onSubmit={submit} aria-label="password-recovery" noValidate>
      {serverError ? <p role="alert">{serverError}</p> : null}
      <FormField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <button type="submit" disabled={isSubmitting}>
        Отправить ссылку
      </button>
    </form>
  );
}
