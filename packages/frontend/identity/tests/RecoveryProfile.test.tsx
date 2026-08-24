import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../src/components/ProfileForm';
import { RecoveryForm } from '../src/components/RecoveryForm';

describe('RecoveryForm', () => {
  it('shows the same confirmation regardless of email existence', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RecoveryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'anybody@example.com{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('Если такой email зарегистрирован');
  });

  it('shows an error state when the request fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('network'));
    render(<RecoveryForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Email'), 'anybody@example.com{Enter}');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('ProfileForm', () => {
  it('saves changed profile values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfileForm defaultValues={{ name: 'Alice', locale: 'ru', timezone: 'UTC' }} onSubmit={onSubmit} />,
    );

    const name = screen.getByLabelText('Имя');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice B.');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice B.', locale: 'ru', timezone: 'UTC' });
    expect(await screen.findByRole('status')).toHaveTextContent('Сохранено.');
  });

  it('rejects an invalid locale', async () => {
    const onSubmit = vi.fn();
    render(
      <ProfileForm defaultValues={{ name: 'Alice', locale: 'ru', timezone: 'UTC' }} onSubmit={onSubmit} />,
    );

    const locale = screen.getByLabelText('Локаль');
    await userEvent.clear(locale);
    await userEvent.type(locale, 'RUS');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(locale).toHaveAttribute('aria-invalid', 'true');
  });
});
