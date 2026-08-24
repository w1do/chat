import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@vendor/api-client';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../src/components/RegisterForm';

describe('RegisterForm', () => {
  it('maps 422 envelope errors onto fields', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        code: 'validation_failed',
        message: 'invalid',
        details: { errors: { email: ['Этот email уже занят.'] } },
        trace_id: null,
      }),
    );
    render(<RegisterForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Имя'), 'Alice');
    await userEvent.type(screen.getByLabelText('Email'), 'taken@example.com');
    await userEvent.type(screen.getByLabelText('Пароль'), 'long-enough-pass{Enter}');

    expect(await screen.findByText('Этот email уже занят.')).toBeInTheDocument();
  });

  it('rejects a short password client-side', async () => {
    const onSubmit = vi.fn();
    render(<RegisterForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Имя'), 'Alice');
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
    await userEvent.type(screen.getByLabelText('Пароль'), 'short{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'true');
  });
});
