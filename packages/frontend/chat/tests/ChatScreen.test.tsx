import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import type { Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const room = (extra: Partial<Room> = {}): Room => ({
  id: 'r1',
  name: 'Общая',
  topic: 'Вся семья',
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 3,
  unread_count: 0,
  ...extra,
});

const message = (id: string, extra: Partial<Message> = {}): Message => ({
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

const members: Member[] = [
  { id: 'm1', room_id: 'r1', user_id: 'u1', role: 'owner', joined_at: '', name: 'Alice' },
  { id: 'm2', room_id: 'r1', user_id: 'u-bob', role: 'member', joined_at: '', name: 'Bob' },
];

const handlers = {
  onBack: vi.fn(),
  onLoadMore: vi.fn(),
  onTyping: vi.fn(),
  onToggleReaction: vi.fn(),
  onDeleteMessage: vi.fn(),
  onMagic: vi.fn(),
  onUndoMagic: vi.fn(),
};

/** Черновик контролируется приложением — оборачиваем в состояние. */
function Harness(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  const [draft, setDraft] = useState('');

  return (
    <ChatScreen
      room={room()}
      messages={[message('m1')]}
      members={members}
      currentUserId="me"
      theme={LIGHT}
      textSize="M"
      sendOnEnter
      showTyping
      typingUserIds={[]}
      connection="connected"
      keyboard={0}
      isLoading={false}
      hasMore={false}
      aiEnabled={false}
      undoText={null}
      magicBusy={false}
      draft={draft}
      onDraftChange={setDraft}
      onSend={async () => undefined}
      {...handlers}
      {...props}
    />
  );
}

describe('ChatScreen', () => {
  it('shows loading, error and empty states', () => {
    const { rerender } = render(<Harness isLoading messages={[]} />);
    expect(screen.getByText('Загрузка сообщений…')).toBeInTheDocument();

    rerender(<Harness isLoading={false} error={new Error('x')} messages={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить сообщения.');

    rerender(<Harness isLoading={false} messages={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Пока тихо');
  });

  it('renders user text safely without injecting HTML', () => {
    render(<Harness messages={[message('m1', { body: '<img src=x onerror=alert(1)>' })]} />);

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('sends a message with Enter and clears the field', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Привет{Enter}');

    expect(onSend).toHaveBeenCalledWith({ body: 'Привет', reply_to_id: null, mentions: undefined });
    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue('');
  });

  it('keeps the text and shows an error when sending fails', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('network'));
    render(<Harness onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Оставь меня{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось отправить.');
    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue('Оставь меня');
  });

  it('replies to a message and sends the reply target', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ответить на сообщение m1' }));
    expect(screen.getByLabelText('Ответ на сообщение')).toHaveTextContent('Ответ Alice');

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Отвечаю{Enter}');
    expect(onSend).toHaveBeenCalledWith({ body: 'Отвечаю', reply_to_id: 'm1', mentions: undefined });
  });

  it('picks mentions typed after @', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    const field = screen.getByRole('textbox', { name: 'Сообщение' });
    await userEvent.type(field, 'Привет @Bo');
    await userEvent.click(screen.getByRole('option', { name: 'Bob' }));
    await userEvent.type(field, '{Enter}');

    expect(onSend).toHaveBeenCalledWith({ body: 'Привет @Bob', reply_to_id: null, mentions: ['u-bob'] });
  });

  it('deletes own messages only', async () => {
    const onDeleteMessage = vi.fn();
    render(
      <Harness
        messages={[message('mine', { author_id: 'me' }), message('theirs', { author_id: 'u1' })]}
        onDeleteMessage={onDeleteMessage}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Удалить сообщение theirs' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Удалить сообщение mine' }));
    expect(onDeleteMessage).toHaveBeenCalledWith('mine');
  });

  it('shows deleted placeholder and toggles reactions', async () => {
    const onToggleReaction = vi.fn();
    render(
      <Harness
        messages={[
          message('m2', { reactions: [{ emoji: '👍', count: 2, reacted_by_me: true }] }),
          message('m1', { deleted: true, body: null }),
        ]}
        onToggleReaction={onToggleReaction}
      />,
    );

    expect(screen.getByText('Сообщение удалено')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Реакции: 2' }));
    expect(onToggleReaction).toHaveBeenCalledWith('m2', '👍');
  });

  it('offers joining instead of the composer for non-members', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(<Harness room={room({ my_role: null })} onJoin={onJoin} />);

    expect(screen.queryByRole('textbox', { name: 'Сообщение' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Вступить в комнату' }));
    expect(onJoin).toHaveBeenCalled();
  });

  it('explains an archived room and hides the composer', () => {
    render(<Harness room={room({ archived_at: '2026-08-24T12:00:00Z' })} />);

    expect(screen.getByText(/Комната в архиве/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Сообщение' })).toBeNull();
  });

  it('shows the reconnect banner and typing indicator', () => {
    const { rerender } = render(<Harness connection="reconnecting" />);
    expect(screen.getByLabelText('Состояние соединения')).toHaveTextContent('Переподключение');

    rerender(<Harness typingUserIds={['u-bob']} />);
    expect(screen.getByRole('status')).toHaveTextContent('Bob печатает');
  });

  it('loads earlier messages on demand', async () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore onLoadMore={onLoadMore} />);

    await userEvent.click(screen.getByRole('button', { name: 'Показать более ранние' }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});
