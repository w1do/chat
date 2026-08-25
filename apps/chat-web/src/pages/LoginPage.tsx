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
  // Логин общий для входа и регистрации: переключение вкладки его не теряет.
  const [sharedLogin, setSharedLogin] = useState('');
  const { login, register } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const theme: ThemeTokens = THEMES[settings.theme];

  return (
    <div
      className="w-full grid place-items-center px-5"
      style={{ background: theme.bg, minHeight: '100dvh', paddingTop: 24, paddingBottom: 24 }}
    >
      <main className="w-full max-w-sm" style={{ color: theme.text }}>
        <div className="text-center mb-6">
          <span
            aria-hidden="true"
            className="inline-grid place-items-center mb-3"
            style={{ width: 56, height: 56, borderRadius: 20, background: theme.surfaceAlt, fontSize: 28 }}
          >
            💬
          </span>
          <h1 className="text-[26px] font-semibold" style={{ letterSpacing: '-0.03em' }}>
            {TITLES[mode]}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: theme.muted }}>
            {SUBTITLES[mode]}
          </p>
        </div>

        <div
          className="p-5"
          style={{
            background: theme.surface,
            borderRadius: RADIUS.md,
            boxShadow: '0 10px 40px rgba(20,19,26,.08)',
          }}
        >
          {mode === 'login' ? (
            <LoginForm
              theme={theme}
              defaultLogin={sharedLogin}
              onLoginChange={setSharedLogin}
              onSubmit={async (input) => {
                await login.mutateAsync(input);
                navigate('/');
              }}
            />
          ) : null}
          {mode === 'register' ? (
            <RegisterForm
              theme={theme}
              defaultLogin={sharedLogin}
              onLoginChange={setSharedLogin}
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

        <nav aria-label="Способы входа" className="flex flex-wrap justify-center gap-4 mt-5">
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
