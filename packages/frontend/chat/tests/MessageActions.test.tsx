import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { MessageActionsSheet } from '../src/components/mobile/MessageActionsSheet';
import type { Message } from '../src/schemas/message';

const message: Message = {
  id: 'm1',
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Алиса',
  author_avatar_url: null,
  reply_to_id: null,
  body: 'рецепт борща',
  mentions: [],
  edited_at: null,
  deleted: false,
  created_at: '2026-08-25T12:00:00Z',
  reactions: [],
  payload: null,
};

function renderSheet(own = false, handlers: Record<string, ReturnType<typeof vi.fn>> = {}) {
  const props = {
    onClose: vi.fn(),
    onReply: vi.fn(),
    onReact: vi.fn(),
    onDelete: vi.fn(),
    onCopied: vi.fn(),
    ...handlers,
  };

  render(
    <MessageActionsSheet message={message} authorName="Алиса" own={own} theme={LIGHT} {...(props as never)} />,
  );

  return props;
}

describe('MessageActionsSheet', () => {
  it('copies the message text and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { onCopied } = renderSheet(false);
    await userEvent.click(screen.getByRole('button', { name: 'Копировать текст' }));

    expect(writeText).toHaveBeenCalledWith('рецепт борща');
    expect(onCopied).toHaveBeenCalledWith(true);
  });

  it('reports a failed copy instead of staying silent', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });

    const { onCopied } = renderSheet(false);
    await userEvent.click(screen.getByRole('button', { name: 'Копировать текст' }));

    expect(onCopied).toHaveBeenCalledWith(false);
  });

  it('sends the chosen reaction and closes', async () => {
    const { onReact, onClose } = renderSheet(false);

    await userEvent.click(
      within(screen.getByRole('group', { name: 'Реакции' })).getByRole('button', { name: 'Реакция 👍' }),
    );

    expect(onReact).toHaveBeenCalledWith(message, '👍');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape without acting', async () => {
    const { onClose, onReply, onDelete } = renderSheet(true);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(onReply).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
