import { ProfileForm, useAuth } from '@vendor/identity';

export function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();

  if (!user) return null;

  return (
    <main>
      <h1>Профиль</h1>
      <ProfileForm
        defaultValues={{ name: user.name, locale: user.locale, timezone: user.timezone }}
        onSubmit={(input) => updateProfile.mutateAsync(input)}
      />
      <button type="button" onClick={() => logout.mutate()}>
        Выйти
      </button>
    </main>
  );
}
