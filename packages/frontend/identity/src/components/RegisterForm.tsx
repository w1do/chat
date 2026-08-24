import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError } from '@vendor/api-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '../schemas/auth';
import { FormField } from './FormField';

interface RegisterFormProps {
  onSubmit: (input: RegisterInput) => Promise<unknown>;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const submit = handleSubmit(async (input) => {
    setServerError(null);
    try {
      await onSubmit(input);
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        const fieldErrors = (error.envelope.details as { errors?: Record<string, string[]> }).errors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (field === 'name' || field === 'email' || field === 'password') {
            setError(field, { message: messages[0] });
          }
        }
      } else {
        setServerError('Не удалось зарегистрироваться. Попробуйте ещё раз.');
      }
    }
  });

  return (
    <form onSubmit={submit} aria-label="register" noValidate>
      {serverError ? <p role="alert">{serverError}</p> : null}
      <FormField label="Имя" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <FormField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <FormField
        label="Пароль"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <button type="submit" disabled={isSubmitting}>
        Создать аккаунт
      </button>
    </form>
  );
}
