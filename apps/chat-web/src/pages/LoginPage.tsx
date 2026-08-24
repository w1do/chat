import { identityApi, LoginForm, RecoveryForm, RegisterForm, useAuth } from '@vendor/identity';
import { RADIUS, THEMES, useTheme } from '@vendor/ui';
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

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const { login, register } = useAuth();
  const { settings } = useSettings();
  const { theme: fallback } = useTheme();
  const navigate = useNavigate();

  const theme = THEMES[settings.theme] ?? fallback;

  return (
    <div className="w-full flex justify-center" style={{ background: theme.bg, minHeight: '100dvh' }}>
      <main className="w-full max-w-md px-5 safe-top" style={{ color: theme.text }}>
        <h1 className="text-[28px] font-semibold mb-1" style={{ letterSpacing: '-0.035em' }}>
          {TITLES[mode]}
        </h1>
        <p className="text-[14px] mb-5" style={{ color: theme.muted }}>
          Чат для своих: комнаты, сообщения, уведомления.
        </p>

        <div className="p-4 auth-form" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
          {mode === 'login' ? (
            <LoginForm
              onSubmit={async (input) => {
                await login.mutateAsync(input);
                navigate('/');
              }}
            />
          ) : null}
          {mode === 'register' ? (
            <RegisterForm
              onSubmit={async (input) => {
                await register.mutateAsync(input);
                navigate('/');
              }}
            />
          ) : null}
          {mode === 'recovery' ? (
            <RecoveryForm onSubmit={(input) => identityApi.forgotPassword(apiClient(), input)} />
          ) : null}
        </div>

        <nav aria-label="Способы входа" className="flex flex-wrap gap-3 mt-4">
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

        {/* Формы приходят из feature-пакета: оформление задаётся здесь. */}
        <style>{`
          .auth-form form { display: flex; flex-direction: column; gap: 12px; }
          .auth-form label { display: block; font-size: 13px; margin-bottom: 4px; color: ${theme.muted}; }
          .auth-form input {
            width: 100%; font-size: 16px; padding: 10px 12px; outline: none;
            background: ${theme.surfaceAlt}; color: ${theme.text}; border-radius: ${RADIUS.sm}px;
          }
          .auth-form input[aria-invalid="true"] { box-shadow: inset 0 0 0 1.5px ${theme.danger}; }
          .auth-form button[type="submit"] {
            margin-top: 4px; padding: 11px 0; font-size: 15px; font-weight: 500;
            background: ${theme.text}; color: ${theme.bg}; border-radius: ${RADIUS.sm}px;
          }
          .auth-form [role="alert"] { font-size: 13px; color: ${theme.danger}; }
          .auth-form [role="status"] { font-size: 14px; color: ${theme.muted}; }
        `}</style>
      </main>
    </div>
  );
}
