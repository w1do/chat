import { identityApi, LoginForm, RecoveryForm, RegisterForm, useAuth } from '@vendor/identity';
import { RADIUS, THEMES, type ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../app/api';
import { useSettings } from '../app/settings';

type Mode = 'login' | 'register' | 'recovery';

const TITLES: Record<Mode, string> = {
  login: 'Вход',
  register: 'Регистрация',
  recovery: 'Восстановление пароля',
};

const SUBTITLES: Record<Mode, string> = {
  login: 'Логин и пароль — больше ничего не нужно',
  register: 'Придумайте логин и пароль, и вы в чате',
  recovery: 'Работает, если в настройках указана почта',
};

/** Вход и регистрация в оформлении дизайн-системы (design 1a/1b). */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const { login, register } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const theme: ThemeTokens = THEMES[settings.theme];

  return (
    <div className="w-full flex justify-center" style={{ background: theme.bg, minHeight: '100dvh' }}>
      <main className="w-full max-w-md px-5 safe-top" style={{ color: theme.text }}>
        <h1 className="text-[28px] font-semibold mb-1" style={{ letterSpacing: '-0.035em' }}>
          {TITLES[mode]}
        </h1>
        <p className="text-[14px] mb-5" style={{ color: theme.muted }}>
          {SUBTITLES[mode]}
        </p>

        <div className="p-4" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
          {mode === 'login' ? (
            <LoginForm
              theme={theme}
              onSubmit={async (input) => {
                await login.mutateAsync(input);
                navigate('/');
              }}
            />
          ) : null}
          {mode === 'register' ? (
            <RegisterForm
              theme={theme}
              onSubmit={async (input) => {
                await register.mutateAsync(input);
                navigate('/');
              }}
            />
          ) : null}
          {mode === 'recovery' ? (
            <RecoveryForm theme={theme} onSubmit={(input) => identityApi.forgotPassword(apiClient(), input)} />
          ) : null}
        </div>

        <nav aria-label="Способы входа" className="flex flex-wrap gap-4 mt-4">
          {mode !== 'login' ? (
            <button type="button" className="text-[15px] tap" style={{ color: theme.text }} onClick={() => setMode('login')}>
              Вход
            </button>
          ) : null}
          {mode !== 'register' ? (
            <button type="button" className="text-[15px] tap" style={{ color: theme.text }} onClick={() => setMode('register')}>
              Регистрация
            </button>
          ) : null}
          {mode !== 'recovery' ? (
            <button type="button" className="text-[15px] tap" style={{ color: theme.muted }} onClick={() => setMode('recovery')}>
              Забыли пароль?
            </button>
          ) : null}
        </nav>
      </main>
    </div>
  );
}
