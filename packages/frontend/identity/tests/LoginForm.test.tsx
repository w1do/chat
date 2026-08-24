import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@vendor/api-client';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../src/components/LoginForm';

describe('LoginForm', () => {
  it('submits valid credentials (happy path, keyboard only)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    //管ление только с клавиатуры: tab → поля → Enter.
    await userEvent.keyboard('{Tab}');
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret-password{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'secret-password' });
  });

  it('shows validation errors for empty input and does not submit', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    // Ошибка привязана к полю через aria-describedby.
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a server error state for invalid credentials', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(401, { code: 'unauthenticated', message: 'x', details: {}, trace_id: null }),
    );
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль.');
  });
});
