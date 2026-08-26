import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LIGHT } from '@vendor/ui';
import { StartConversationPanel } from '../src/components/mobile/StartConversationPanel';

vi.mock('../src/hooks/useRooms', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    useDirectCandidates: vi.fn(),
  };
});

const { useDirectCandidates } = await import('../src/hooks/useRooms');

describe('StartConversationPanel', () => {
  beforeEach(() => {
    (useDirectCandidates as jest.MockedFunction<any>).mockReset?.();
  });

  it('shows hint, then results and starts a conversation', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    // По умолчанию — нет поиска/результатов
    (useDirectCandidates as jest.MockedFunction<any>).mockReturnValue({ data: [], isPending: false, error: null });

    render(<StartConversationPanel theme={LIGHT} onStart={onStart} onCancel={onCancel} />);

    expect(screen.getByText('Введите хотя бы два символа ника.')).toBeInTheDocument();

    // Начинаем ввод; эмулируем, что поиск вернул одного найденного пользователя
    (useDirectCandidates as jest.MockedFunction<any>).mockReturnValue({
      data: [{ id: 'u2', username: 'bob', name: 'Bob Builder' }],
      isPending: false,
      error: null,
    });

    await userEvent.type(screen.getByLabelText('Ник собеседника'), '@bo');

    // Появляется найденный пользователь и можно начать переписку
    expect(await screen.findByText('Bob Builder')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Bob Builder/ }));

    expect(onStart).toHaveBeenCalledWith('u2');
  });

  it('shows an error when starting a conversation fails (e.g., with yourself)', async () => {
    const onStart = vi.fn().mockRejectedValue(new Error('self'));
    const onCancel = vi.fn();

    (useDirectCandidates as jest.MockedFunction<any>).mockReturnValue({
      data: [{ id: 'me', username: 'alice', name: 'Alice' }],
      isPending: false,
      error: null,
    });

    render(<StartConversationPanel theme={LIGHT} onStart={onStart} onCancel={onCancel} />);

    await userEvent.type(screen.getByLabelText('Ник собеседника'), '@al');
    await userEvent.click(await screen.findByRole('button', { name: /Alice/ }));

    expect(onStart).toHaveBeenCalledWith('me');
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось начать переписку.');
  });

  it('re-selecting the same user triggers the same start flow (idempotent open)', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    (useDirectCandidates as jest.MockedFunction<any>).mockReturnValue({
      data: [{ id: 'u2', username: 'bob', name: 'Bob Builder' }],
      isPending: false,
      error: null,
    });

    render(<StartConversationPanel theme={LIGHT} onStart={onStart} onCancel={onCancel} />);

    await userEvent.type(screen.getByLabelText('Ник собеседника'), '@bob');
    const btn = await screen.findByRole('button', { name: /Bob Builder/ });
    await userEvent.click(btn);
    await userEvent.click(btn);

    expect(onStart).toHaveBeenCalledTimes(2);
    expect(onStart).toHaveBeenLastCalledWith('u2');
  });
});
