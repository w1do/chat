import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/app/settings', () => ({
  useSettings: () => ({ settings: { theme: 'light' } }),
}));

const login = vi.fn().mockResolvedValue(undefined);
const register = vi.fn().mockResolvedValue(undefined);

vi.mock('@vendor/identity', async () => {
  const actual = await vi.importActual<typeof import('@vendor/identity')>('@vendor/identity');

  return {
    ...actual,
    useAuth: () => ({ login: { mutateAsync: login }, register: { mutateAsync: register } }),
    identityApi: { forgotPassword: vi.fn() },
  };
});

import { LoginPage } from '../src/pages/LoginPage';

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

describe('LoginPage', () => {
  it('показывает вход по логину и паролю', () => {
    render(<LoginPage />, { wrapper });

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Логин' })).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
  });

  it('сохраняет введённый логин при переключении на регистрацию', async () => {
    render(<LoginPage />, { wrapper });

    await userEvent.type(screen.getByRole('textbox', { name: 'Логин' }), 'семья');
    await userEvent.click(screen.getByRole('button', { name: 'Регистрация' }));

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Логин' })).toHaveValue('семья');
  });

  it('объясняет, что почта не нужна для регистрации', async () => {
    render(<LoginPage />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Регистрация' }));

    expect(screen.getByText(/Придумайте логин и пароль/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Почта' })).toBeNull();
  });
});
