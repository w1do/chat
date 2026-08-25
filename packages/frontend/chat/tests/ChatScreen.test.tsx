import { fireEvent, render, screen, within } from '@testing-library/react';
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
  kind: 'text',
  author_id: 'u1',
  author_name: 'Alice',
  reply_to_id: null,
  body: `Message ${id}`,
  mentions: [],
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  payload: null,
  ...extra,
});

const systemMessage = (id: string, event: 'member.joined' | 'member.left', actorId: string): Message =>
  message(id, {
    kind: 'system',
    body: '',
    author_id: actorId,
    payload: { event, actor_id: actorId },
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

/** Свайп влево по сообщению: pointer-события с заданным смещением. */
function swipeLeft(element: Element, distance: number): void {
  fireEvent.pointerDown(element, { clientX: 200, clientY: 100, button: 0 });
  fireEvent.pointerMove(element, { clientX: 200 - distance / 2, clientY: 100 });
  fireEvent.pointerMove(element, { clientX: 200 - distance, clientY: 100 });
  fireEvent.pointerUp(element, { clientX: 200 - distance, clientY: 100 });
}

/** Двойное касание: два быстрых нажатия в одной точке. */
function doubleTap(element: Element): void {
  for (const _ of [1, 2]) {
    fireEvent.pointerDown(element, { clientX: 120, clientY: 80, button: 0 });
    fireEvent.pointerUp(element, { clientX: 120, clientY: 80 });
  }
}

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

  it('replies by swiping the message left', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    swipeLeft(screen.getByLabelText('Сообщение m1'), 80);
    expect(screen.getByLabelText('Ответ на сообщение')).toHaveTextContent('Ответ Alice');

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Отвечаю{Enter}');
    expect(onSend).toHaveBeenCalledWith({ body: 'Отвечаю', reply_to_id: 'm1', mentions: undefined });
  });

  it('does not start a reply when the swipe is too short or vertical', () => {
    render(<Harness />);
    const message = screen.getByLabelText('Сообщение m1');

    swipeLeft(message, 20);
    expect(screen.queryByLabelText('Ответ на сообщение')).toBeNull();

    // Вертикальное движение отдаётся прокрутке ленты.
    fireEvent.pointerDown(message, { clientX: 200, clientY: 100, button: 0 });
    fireEvent.pointerMove(message, { clientX: 120, clientY: 160 });
    fireEvent.pointerUp(message, { clientX: 120, clientY: 160 });
    expect(screen.queryByLabelText('Ответ на сообщение')).toBeNull();
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

  it('offers deletion in the menu for own messages only', async () => {
    const onDeleteMessage = vi.fn();
    render(
      <Harness
        messages={[message('mine', { author_id: 'me' }), message('theirs', { author_id: 'u1' })]}
        onDeleteMessage={onDeleteMessage}
      />,
    );

    // Чужое сообщение: удаления в меню нет.
    fireEvent.contextMenu(screen.getByLabelText('Сообщение theirs'));
    expect(screen.getByRole('button', { name: 'Ответить' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    fireEvent.contextMenu(screen.getByLabelText('Сообщение mine'));
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(onDeleteMessage).toHaveBeenCalledWith('mine');
  });

  it('has no action buttons in the feed itself', () => {
    render(<Harness messages={[message('m1', { author_id: 'me' })]} />);

    expect(screen.queryByRole('button', { name: /Ответить на сообщение/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Удалить сообщение/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Выбрать реакцию/ })).toBeNull();
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

  it('starts a reply from the actions menu', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    fireEvent.contextMenu(screen.getByLabelText('Сообщение m1'));
    await userEvent.click(screen.getByRole('button', { name: 'Ответить' }));

    expect(screen.getByLabelText('Ответ на сообщение')).toHaveTextContent('Ответ Alice');

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Отвечаю{Enter}');
    expect(onSend).toHaveBeenCalledWith({ body: 'Отвечаю', reply_to_id: 'm1', mentions: undefined });
  });

  it('opens the actions menu from the keyboard', async () => {
    render(<Harness />);

    const message = screen.getByLabelText('Сообщение m1');
    message.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Ответить' })).toBeInTheDocument();
  });

  it('cancels a started reply', async () => {
    render(<Harness />);

    swipeLeft(screen.getByLabelText('Сообщение m1'), 80);
    await userEvent.click(screen.getByRole('button', { name: 'Отменить ответ' }));

    expect(screen.queryByLabelText('Ответ на сообщение')).toBeNull();
  });

  it('jumps from a quote to the original message', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<Harness messages={[message('m2', { reply_to_id: 'm1' }), message('m1')]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Перейти к сообщению m1' }));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('says so when the quoted original is deleted', () => {
    render(
      <Harness messages={[message('m2', { reply_to_id: 'm1' }), message('m1', { deleted: true, body: null })]} />,
    );

    const quote = screen.getByRole('button', { name: 'Перейти к сообщению m1' });
    expect(quote).toHaveTextContent('Сообщение удалено');
  });

  it('reacts with an emoji chosen from the menu', async () => {
    const onToggleReaction = vi.fn();
    render(<Harness onToggleReaction={onToggleReaction} />);

    fireEvent.contextMenu(screen.getByLabelText('Сообщение m1'));
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Реакции' })).getByRole('button', { name: 'Реакция 🔥' }),
    );

    expect(onToggleReaction).toHaveBeenCalledWith('m1', '🔥');
  });

  it('puts a quick heart on a double tap', () => {
    const onToggleReaction = vi.fn();
    render(<Harness onToggleReaction={onToggleReaction} />);

    doubleTap(screen.getByLabelText('Сообщение m1'));

    expect(onToggleReaction).toHaveBeenCalledWith('m1', '❤️');
  });

  it('leaves deleted messages alone', () => {
    const onToggleReaction = vi.fn();
    render(
      <Harness messages={[message('m1', { deleted: true, body: null })]} onToggleReaction={onToggleReaction} />,
    );

    const deletedMessage = screen.getByLabelText('Сообщение m1');
    doubleTap(deletedMessage);
    swipeLeft(deletedMessage, 80);

    expect(onToggleReaction).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Ответ на сообщение')).toBeNull();
  });

  it('inserts an emoji into the draft at the caret', async () => {
    render(<Harness />);

    const field = screen.getByRole('textbox', { name: 'Сообщение' });
    await userEvent.type(field, 'Привет');
    await userEvent.click(screen.getByRole('button', { name: 'Эмодзи' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Эмодзи для сообщения' })).getByRole('button', { name: '🎉' }));

    expect(field).toHaveValue('Привет🎉');
  });

  it('renders membership system messages as plain timeline entries', () => {
    render(
      <Harness
        messages={[
          systemMessage('s2', 'member.left', 'u-bob'),
          message('m1'),
          systemMessage('s1', 'member.joined', 'u-bob'),
        ]}
      />,
    );

    expect(screen.getByLabelText('Событие комнаты s1')).toHaveTextContent('Bob присоединился к комнате');
    expect(screen.getByLabelText('Событие комнаты s2')).toHaveTextContent('Bob покинул комнату');
    // Системные записи не предлагают ответ и реакции.
    expect(screen.queryByRole('button', { name: 'Ответить на сообщение s1' })).toBeNull();
  });
});
