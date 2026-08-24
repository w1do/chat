import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { profileSchema, type ProfileInput } from '../schemas/auth';
import { FormField } from './FormField';

interface ProfileFormProps {
  defaultValues: ProfileInput;
  onSubmit: (input: ProfileInput) => Promise<unknown>;
}

export function ProfileForm({ defaultValues, onSubmit }: ProfileFormProps) {
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
    <form onSubmit={submit} aria-label="profile" noValidate>
      {serverError ? <p role="alert">{serverError}</p> : null}
      {saved ? <p role="status">Сохранено.</p> : null}
      <FormField label="Имя" error={errors.name?.message} {...register('name')} />
      <FormField label="Локаль" error={errors.locale?.message} {...register('locale')} />
      <FormField label="Часовой пояс" error={errors.timezone?.message} {...register('timezone')} />
      <button type="submit" disabled={isSubmitting}>
        Сохранить
      </button>
    </form>
  );
}
