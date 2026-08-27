import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { MessageBubble } from '../src/components/mobile/MessageBubble';
import type { Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const room: Room = {
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 2,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
};

const members: Member[] = [
  {
    id: 'm-me',
    room_id: 'r1',
    user_id: 'me',
    role: 'member',
    joined_at: '',
    name: 'Я',
    username: 'me',
    avatar_url: null,
    is_online: true,
    last_seen_at: null,
  },
];

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  room_id: 'r1',
  kind: 'text',
  author_id: 'me',
  author_name: 'Я',
  author_avatar_url: null,
  reply_to_id: null,
  body: 'первый вариант',
  mentions: [],
  is_edited: false,
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  attachments: [],
  payload: null,
  ...extra,
});

function Harness(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  const [draft, setDraft] = useState('');

  return (
    <ChatScreen
      room={room}
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
      onEditMessage={async () => undefined}
      onBack={vi.fn()}
      onLoadMore={vi.fn()}
      onTyping={vi.fn()}
      onToggleReaction={vi.fn()}
      onDeleteMessage={vi.fn()}
      onMagic={vi.fn()}
      onUndoMagic={vi.fn()}
      {...props}
    />
  );
}

/** Строка ввода: у меню действий тот же заголовок, ищем именно поле. */
const composer = () => screen.getByRole('textbox', { name: 'Сообщение' });

/** Открытие правки: меню действий сообщения → «Редактировать». */
async function startEditing(id = 'm1') {
  fireEvent.contextMenu(screen.getByLabelText(`Сообщение ${id}`));
  await userEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
}

describe('editing a message in the composer', () => {
  it('puts the original text into the composer with a banner', async () => {
    render(<Harness />);
    await startEditing();

    expect(composer()).toHaveValue('первый вариант');
    expect(screen.getByLabelText('Редактирование сообщения')).toHaveTextContent('Редактирование: первый вариант');
    expect(screen.getByRole('button', { name: 'Сохранить правку' })).toBeInTheDocument();
  });

  it('saves the edited text and leaves the edit mode', async () => {
    const onEditMessage = vi.fn().mockResolvedValue(undefined);
    render(<Harness onEditMessage={onEditMessage} />);
    await startEditing();

    await userEvent.clear(composer());
    await userEvent.type(composer(), 'второй вариант');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить правку' }));

    expect(onEditMessage).toHaveBeenCalledWith('m1', 'второй вариант');
    expect(screen.queryByLabelText('Редактирование сообщения')).toBeNull();
    expect(composer()).toHaveValue('');
  });

  it('does not send a new message while editing', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onEditMessage = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} onEditMessage={onEditMessage} />);
    await startEditing();

    await userEvent.type(composer(), '{Enter}');

    expect(onSend).not.toHaveBeenCalled();
    expect(onEditMessage).toHaveBeenCalledTimes(1);
  });

  it('cancels editing with the banner button and leaves the message alone', async () => {
    const onEditMessage = vi.fn().mockResolvedValue(undefined);
    render(<Harness onEditMessage={onEditMessage} />);
    await startEditing();

    await userEvent.click(screen.getByRole('button', { name: 'Отменить редактирование' }));

    expect(onEditMessage).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Редактирование сообщения')).toBeNull();
    expect(composer()).toHaveValue('');
  });

  it('cancels editing with Escape', async () => {
    render(<Harness />);
    await startEditing();

    fireEvent.keyDown(composer(), { key: 'Escape' });

    expect(screen.queryByLabelText('Редактирование сообщения')).toBeNull();
    expect(composer()).toHaveValue('');
  });

  it('keeps the text in the composer when saving fails', async () => {
    const onEditMessage = vi.fn().mockRejectedValue(new Error('offline'));
    render(<Harness onEditMessage={onEditMessage} />);
    await startEditing();

    await userEvent.type(composer(), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить правку' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить правку');
    expect(composer()).toHaveValue('первый вариант!');
    expect(screen.getByLabelText('Редактирование сообщения')).toBeInTheDocument();
  });

  it('hides the edit action when the screen cannot save it', () => {
    render(<Harness onEditMessage={undefined} />);
    fireEvent.contextMenu(screen.getByLabelText('Сообщение m1'));

    expect(screen.queryByRole('button', { name: 'Редактировать' })).toBeNull();
  });
});

describe('edited mark in the feed', () => {
  const bubbleProps = {
    reply: null,
    replyAuthor: '',
    own: true,
    first: true,
    last: true,
    theme: LIGHT,
    fontSize: 16,
    highlighted: false,
    onReply: vi.fn(),
    onQuickReaction: vi.fn(),
    onOpenActions: vi.fn(),
    onToggleReaction: vi.fn(),
    onJump: vi.fn(),
  };

  it('marks an edited message next to its time', () => {
    render(
      <MessageBubble
        {...bubbleProps}
        message={message('m1', { is_edited: true, edited_at: '2026-08-24T12:30:00Z' })}
      />,
    );

    expect(screen.getByText('изменено')).toBeInTheDocument();
  });

  it('leaves an untouched message without the mark', () => {
    render(<MessageBubble {...bubbleProps} message={message('m1')} />);

    expect(screen.queryByText('изменено')).toBeNull();
  });
});
