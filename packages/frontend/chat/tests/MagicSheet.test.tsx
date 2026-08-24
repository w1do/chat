import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { MagicSheet } from '../src/components/mobile/MagicSheet';

const base = {
  open: true,
  action: null,
  original: 'привет как дела',
  suggestion: null,
  error: null,
  theme: LIGHT,
  onRun: vi.fn(),
  onApply: vi.fn(),
  onClose: vi.fn(),
};

describe('MagicSheet', () => {
  it('runs the chosen operation, passing the tone where the action needs one', async () => {
    const onRun = vi.fn();
    render(<MagicSheet {...base} phase="menu" onRun={onRun} />);

    await userEvent.click(screen.getByRole('button', { name: /Понятнее/ }));
    expect(onRun).toHaveBeenCalledWith('clarify', undefined);

    await userEvent.click(screen.getByRole('button', { name: /Мягче/ }));
    expect(onRun).toHaveBeenCalledWith('tone', 'softer');
  });

  it('lets the user cancel while waiting for the provider', async () => {
    const onCancel = vi.fn();
    render(<MagicSheet {...base} phase="loading" action="fix" onCancel={onCancel} />);

    expect(screen.getByText('Текст обрабатывается внешним ИИ…')).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Отменить ожидание' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows the suggestion beside the draft and applies it only on demand', async () => {
    const onApply = vi.fn();
    render(
      <MagicSheet {...base} phase="preview" action="clarify" suggestion="Привет! Как дела?" onApply={onApply} />,
    );

    expect(screen.getByText('привет как дела')).toBeInTheDocument();
    expect(screen.getByText('Привет! Как дела?')).toBeInTheDocument();
    // Пользователю сказано, что текст обработан внешним ИИ.
    expect(screen.getByText(/обработан внешним ИИ/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Заменить черновик' }));
    expect(onApply).toHaveBeenCalled();
  });

  it('keeps the draft when the user prefers their own text', async () => {
    const onClose = vi.fn();
    const onApply = vi.fn();
    render(
      <MagicSheet {...base} phase="preview" action="fix" suggestion="Правленый текст" onApply={onApply} onClose={onClose} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Оставить своё' }));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('reports a provider error without blocking sending', () => {
    render(
      <MagicSheet {...base} phase="error" action="fix" error="Помощник сейчас недоступен. Сообщение можно отправить как есть." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('можно отправить как есть');
  });

  it('explains that the assistant is switched off', () => {
    render(<MagicSheet {...base} phase="unavailable" />);

    expect(screen.getByText(/отключена на этом сервере/)).toBeInTheDocument();
  });
});
