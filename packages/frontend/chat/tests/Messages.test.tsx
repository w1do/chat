import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from '../src/components/MessageComposer';
import { MessageList } from '../src/components/MessageList';
import type { Message } from '../src/schemas/message';

const msg = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  room_id: 'r1',
  author_id: 'u1',
  author_name: 'Alice',
  reply_to_id: null,
  body: `Message ${id}`,
  mentions: [],
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  ...extra,
});

const listHandlers = {
  onReply: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggleReaction: vi.fn(),
  onLoadMore: vi.fn(),
};

describe('MessageList', () => {
  it('renders history with pagination control and calls onLoadMore', async () => {
    render(
      <MessageList
        messages={[msg('m2'), msg('m1')]}
        isLoading={false}
        currentUserId="u1"
        canModerate={false}
        hasMore
        {...listHandlers}
      />,
    );

    // API отдаёт новые→старые; список рендерит старые сверху.
    const items = screen.getAllByRole('article');
    expect(within(items[0]!).getByText('Message m1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Показать более ранние' }));
    expect(listHandlers.onLoadMore).toHaveBeenCalled();
  });

  it('renders user text safely without injecting HTML', () => {
    render(
      <MessageList
        messages={[msg('m1', { body: '<img src=x onerror=alert(1)>' })]}
        isLoading={false}
        currentUserId="u1"
        canModerate={false}
        hasMore={false}
        {...listHandlers}
      />,
    );

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows deleted placeholder and reply context', () => {
    render(
      <MessageList
        messages={[msg('m2', { reply_to_id: 'm1' }), msg('m1', { deleted: true, body: null })]}
        isLoading={false}
        currentUserId="u1"
        canModerate={false}
        hasMore={false}
        {...listHandlers}
      />,
    );

    expect(screen.getByText('Сообщение удалено')).toBeInTheDocument();
    expect(screen.getByText(/Ответ Alice/)).toBeInTheDocument();
  });

  it('exposes edit/delete for own messages and delete for moderators', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <MessageList
        messages={[msg('mine', { author_id: 'me' }), msg('theirs', { author_id: 'other' })]}
        isLoading={false}
        currentUserId="me"
        canModerate
        hasMore={false}
        {...listHandlers}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const mine = screen.getByRole('article', { name: 'Сообщение mine' });
    await userEvent.click(within(mine).getByRole('button', { name: 'Редактировать' }));
    expect(onEdit).toHaveBeenCalled();

    const theirs = screen.getByRole('article', { name: 'Сообщение theirs' });
    expect(within(theirs).queryByRole('button', { name: 'Редактировать' })).toBeNull();
    await userEvent.click(within(theirs).getByRole('button', { name: 'Удалить' }));
    expect(onDelete).toHaveBeenCalledWith('theirs');
  });

  it('toggles reactions from the reaction bar', async () => {
    const onToggleReaction = vi.fn();
    render(
      <MessageList
        messages={[msg('m1', { reactions: [{ emoji: '👍', count: 2, reacted_by_me: true }] })]}
        isLoading={false}
        currentUserId="u1"
        canModerate={false}
        hasMore={false}
        {...listHandlers}
        onToggleReaction={onToggleReaction}
      />,
    );

    const pressed = screen.getByRole('button', { name: '👍 2', pressed: true });
    await userEvent.click(pressed);
    expect(onToggleReaction).toHaveBeenCalledWith('m1', '👍');
  });
});

describe('MessageComposer', () => {
  it('sends a message with Enter and clears the field', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<MessageComposer onSend={onSend} />);

    await userEvent.type(screen.getByLabelText('Сообщение'), 'Hello{Enter}');

    expect(onSend).toHaveBeenCalledWith({ body: 'Hello', reply_to_id: null, mentions: undefined });
    expect(screen.getByLabelText('Сообщение')).toHaveValue('');
  });

  it('keeps the text and shows an error when sending fails', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('network'));
    render(<MessageComposer onSend={onSend} />);

    await userEvent.type(screen.getByLabelText('Сообщение'), 'Keep me{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось отправить сообщение.');
    expect(screen.getByLabelText('Сообщение')).toHaveValue('Keep me');
  });

  it('sends replies with the reply target id', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onCancelReply = vi.fn();
    render(<MessageComposer onSend={onSend} replyTo={msg('parent')} onCancelReply={onCancelReply} />);

    expect(screen.getByRole('status')).toHaveTextContent('Ответ Alice');
    await userEvent.type(screen.getByLabelText('Сообщение'), 'A reply{Enter}');

    expect(onSend).toHaveBeenCalledWith({ body: 'A reply', reply_to_id: 'parent', mentions: undefined });
    expect(onCancelReply).toHaveBeenCalled();
  });

  it('edits an existing message', async () => {
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    const onCancelEdit = vi.fn();
    render(
      <MessageComposer onSend={vi.fn()} editing={msg('m1', { body: 'Old' })} onSubmitEdit={onSubmitEdit} onCancelEdit={onCancelEdit} />,
    );

    const field = screen.getByLabelText('Изменить сообщение');
    expect(field).toHaveValue('Old');
    await userEvent.clear(field);
    await userEvent.type(field, 'New{Enter}');

    expect(onSubmitEdit).toHaveBeenCalledWith('m1', 'New');
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('picks mentions typed after @', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <MessageComposer
        onSend={onSend}
        members={[
          { id: 'mem1', room_id: 'r1', user_id: 'u-bob', role: 'member', joined_at: '', name: 'Bob' },
        ]}
      />,
    );

    await userEvent.type(screen.getByLabelText('Сообщение'), 'Hi @Bo');
    await userEvent.click(screen.getByRole('option', { name: 'Bob' }));
    await userEvent.type(screen.getByLabelText('Сообщение'), '{Enter}');

    expect(onSend).toHaveBeenCalledWith({ body: 'Hi @Bob', reply_to_id: null, mentions: ['u-bob'] });
  });
});
