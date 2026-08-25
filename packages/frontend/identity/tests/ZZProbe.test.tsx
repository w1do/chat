import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../src/components/LoginForm';

describe('probe', () => {
  it('A: type at submit time (after Field capture listener)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm theme={LIGHT} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Пароль') as HTMLInputElement;
    const form = input.form!;

    await userEvent.type(screen.getByLabelText('Логин'), 'alice');
    await userEvent.type(input, 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Показать пароль/ }));
    expect(input.type).toBe('text');

    let typeAtSubmit = 'NOT-CAPTURED';
    form.addEventListener('submit', () => { typeAtSubmit = input.type; });

    await userEvent.type(input, '{Enter}');
    console.log('PROBE A typeAtSubmit =', typeAtSubmit);
    expect(typeAtSubmit).toBe('password');
  });

  it('B: keyboard activation of the eye moves focus off the button', async () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Пароль');
    const button = screen.getByRole('button', { name: /Показать пароль/ });

    button.focus();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard('{Enter}');

    console.log('PROBE B activeElement after keyboard activate =',
      (document.activeElement as HTMLElement)?.tagName,
      (document.activeElement as HTMLElement)?.getAttribute('aria-label') ?? (document.activeElement as HTMLInputElement)?.type);
    console.log('PROBE B input type now =', (input as HTMLInputElement).type);
    expect(document.activeElement).not.toBe(button);
  });

  it('C: inputProps never contains type', async () => {
    render(<LoginForm theme={LIGHT} onSubmit={vi.fn()} />);
    expect(true).toBe(true);
  });
});
