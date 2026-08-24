import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '../schemas/auth';
import { FormField } from './FormField';

interface LoginFormProps {
  onSubmit: (input: LoginInput) => Promise<unknown>;
  labels?: Partial<Record<'email' | 'password' | 'submit' | 'invalidCredentials' | 'genericError', string>>;
}

export function LoginForm({ onSubmit, labels = {} }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await onSubmit(input);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setServerError(labels.invalidCredentials ?? 'Неверный email или пароль.');
      } else {
        setServerError(labels.genericError ?? 'Не удалось выполнить вход. Попробуйте ещё раз.');
      }
    }
  });

  return (
    <form onSubmit={submit} aria-label="login" noValidate>
      {serverError ? <p role="alert">{serverError}</p> : null}
      <FormField
        label={labels.email ?? 'Email'}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        label={labels.password ?? 'Пароль'}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <button type="submit" disabled={isSubmitting}>
        {labels.submit ?? 'Войти'}
      </button>
    </form>
  );
}
