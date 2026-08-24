import { LoginForm, RecoveryForm, RegisterForm, useAuth } from '@vendor/identity';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../app/api';
import { identityApi } from '@vendor/identity';

type Mode = 'login' | 'register' | 'recovery';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  return (
    <main>
      <h1>{mode === 'login' ? 'Вход' : mode === 'register' ? 'Регистрация' : 'Восстановление пароля'}</h1>

      {mode === 'login' && (
        <LoginForm
          onSubmit={async (input) => {
            await login.mutateAsync(input);
            navigate('/');
          }}
        />
      )}
      {mode === 'register' && (
        <RegisterForm
          onSubmit={async (input) => {
            await register.mutateAsync(input);
            navigate('/');
          }}
        />
      )}
      {mode === 'recovery' && <RecoveryForm onSubmit={(input) => identityApi.forgotPassword(apiClient(), input)} />}

      <nav aria-label="auth-modes">
        {mode !== 'login' && (
          <button type="button" onClick={() => setMode('login')}>
            Вход
          </button>
        )}
        {mode !== 'register' && (
          <button type="button" onClick={() => setMode('register')}>
            Регистрация
          </button>
        )}
        {mode !== 'recovery' && (
          <button type="button" onClick={() => setMode('recovery')}>
            Забыли пароль?
          </button>
        )}
      </nav>
    </main>
  );
}
