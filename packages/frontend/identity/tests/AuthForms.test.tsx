import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@vendor/api-client';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { EmailForm } from '../src/components/EmailForm';
import { LoginForm } from '../src/components/LoginForm';
import { PasswordForm } from '../src/components/PasswordForm';
import { RecoveryForm } from '../src/components/RecoveryForm';
import { RegisterForm } from '../src/components/RegisterForm';

const validationError = (field: string, message: string) =>
  new ApiError(422, {
    code: 'validation_failed',
    message: 'invalid',
    details: { errors: { [field]: [message] } },
    trace_id: null,
  });

describe('LoginForm', () => {
  it('signs in with login and password, keyboard only', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(screen.getByLabelText('Пароль'), 'correct-horse{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ login: 'alice', password: 'correct-horse' });
  });

  it('does not ask for an email at all', () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/Почта/)).toBeNull();
  });

  it('shows a single message for invalid credentials', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(401, { code: 'unauthenticated', message: 'x', details: {}, trace_id: null }),
    );
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(screen.getByLabelText('Пароль'), 'nope{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный логин или пароль.');
  });

  it('validates empty input without submitting', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('RegisterForm', () => {
  it('registers with login and password only', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm theme={LIGHT} onSubmit={onSubmit} />);

    expect(screen.queryByLabelText(/Почта/)).toBeNull();
    expect(screen.getByText(/Почта не нужна для входа/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(screen.getByLabelText('Пароль'), 'long-enough-pass{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ login: 'alice', password: 'long-enough-pass' });
  });

  it('maps a taken login onto the field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(validationError('login', 'Такой логин уже занят.'));
    render(<RegisterForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(screen.getByLabelText('Пароль'), 'long-enough-pass{Enter}');

    expect(await screen.findByText('Такой логин уже занят.')).toBeInTheDocument();
  });

  it('rejects a malformed login client-side', async () => {
    const onSubmit = vi.fn();
    render(<RegisterForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Логин'), 'алиса раз');
    await userEvent.type(screen.getByLabelText('Пароль'), 'long-enough-pass{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('RecoveryForm', () => {
  it('explains that recovery needs an email set in settings', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RecoveryForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Почта'), 'someone@example.com{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('только для аккаунтов с указанной почтой');
  });
});

describe('EmailForm', () => {
  it('saves an email added later', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EmailForm theme={LIGHT} currentEmail={null} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Почта'), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить почту' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'alice@example.com' });
    expect(await screen.findByRole('status')).toHaveTextContent('Сохранено.');
  });

  it('reports a duplicate email on the field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(validationError('email', 'taken'));
    render(<EmailForm theme={LIGHT} currentEmail={null} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Почта'), 'taken@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить почту' }));

    expect(await screen.findByText('Эта почта уже используется.')).toBeInTheDocument();
  });

  it('allows clearing the email', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EmailForm theme={LIGHT} currentEmail="alice@example.com" onSubmit={onSubmit} />);

    await userEvent.clear(screen.getByLabelText('Почта'));
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить почту' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: '' });
  });
});

describe('PasswordForm', () => {
  it('changes the password and clears the fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Текущий пароль'), 'old-password-value');
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'brand-new-password{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({
      current_password: 'old-password-value',
      password: 'brand-new-password',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Пароль изменён.');
  });

  it('marks a wrong current password on its field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(validationError('current_password', 'wrong'));
    render(<PasswordForm theme={LIGHT} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Текущий пароль'), 'wrong-password');
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'brand-new-password{Enter}');

    expect(await screen.findByText('Текущий пароль указан неверно.')).toBeInTheDocument();
  });
});
