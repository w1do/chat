import { zodResolver } from '@hookform/resolvers/zod';
import type { ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { profileSchema, type ProfileInput } from '../schemas/auth';
import { Field } from './Field';
import { SubmitButton } from './SubmitButton';

interface ProfileFormProps {
  theme: ThemeTokens;
  defaultValues: ProfileInput;
  onSubmit: (input: ProfileInput) => Promise<unknown>;
}

export function ProfileForm({ theme, defaultValues, onSubmit }: ProfileFormProps) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });

  const submit = handleSubmit(async (input) => {
    setSaved(false);
    setServerError(null);
    try {
      await onSubmit(input);
      setSaved(true);
    } catch {
      setServerError('Не удалось сохранить профиль.');
    }
  });

  return (
    <form onSubmit={submit} aria-label="profile" noValidate className="flex flex-col gap-3">
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
      <Field theme={theme} label="Имя" error={errors.name?.message} {...register('name')} />
      <Field theme={theme} label="Локаль" error={errors.locale?.message} {...register('locale')} />
      <Field theme={theme} label="Часовой пояс" error={errors.timezone?.message} {...register('timezone')} />
      <SubmitButton theme={theme} busy={isSubmitting}>
        Сохранить
      </SubmitButton>
    </form>
  );
}
