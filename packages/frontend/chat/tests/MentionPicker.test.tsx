import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { MessageBubble } from '../src/components/mobile/MessageBubble';
import { filterMentionCandidates, MentionPicker } from '../src/components/MentionPicker';
import type { Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const member = (userId: string, username: string, name: string, extra: Partial<Member> = {}): Member => ({
  id: `m-${userId}`,
  room_id: 'r1',
  user_id: userId,
  role: 'member',
  joined_at: '',
  name,
  username,
  avatar_url: null,
  is_online: false,
  last_seen_at: null,
  ...extra,
});

const alice = member('u-alice', 'alice', 'Алиса', { is_online: true });
const bob = member('u-bob', 'bob', 'Борис');
const nick = member('u-nick', 'nick', 'Николай');

const room: Room = {
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'public',
  created_by: 'u-alice',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 3,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
};

function Harness(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  const [draft, setDraft] = useState('');

  return (
    <ChatScreen
      room={room}
      messages={[]}
      members={[alice, bob, nick]}
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

const composer = () => screen.getByRole('textbox', { name: 'Сообщение' });

describe('filterMentionCandidates', () => {
  it('offers everyone right after the at sign', () => {
    expect(filterMentionCandidates([alice, bob, nick], '')).toHaveLength(3);
  });

  it('puts nickname matches before name matches', () => {
    // «ник» — начало ника Николая и часть имени никого больше.
    expect(filterMentionCandidates([alice, bob, nick], 'nic').map((m) => m.user_id)).toEqual(['u-nick']);
  });

  it('finds a person by the displayed name too', () => {
    expect(filterMentionCandidates([alice, bob, nick], 'Борис').map((m) => m.user_id)).toEqual(['u-bob']);
  });

  it('keeps the list short', () => {
    const many = Array.from({ length: 12 }, (_, i) => member(`u${i}`, `user${i}`, `Имя ${i}`));

    expect(filterMentionCandidates(many, 'user')).toHaveLength(5);
  });
});

describe('mention picker rows', () => {
  it('shows the nickname, the name and the presence of each candidate', () => {
    render(
      <MentionPicker
        matches={[alice, bob]}
        filter="a"
        activeIndex={0}
        theme={LIGHT}
        onPick={vi.fn()}
        onActivate={vi.fn()}
      />,
    );

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAccessibleName('@alice · Алиса · в сети');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAccessibleName('@bob · Борис');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    // Аватарка кандидата в сети несёт зелёную отметку присутствия.
    expect(screen.getAllByRole('img', { name: 'в сети' })).toHaveLength(1);
  });

  it('shows nothing at all when nobody matches', () => {
    const { container } = render(
      <MentionPicker matches={[]} filter="zzz" activeIndex={0} theme={LIGHT} onPick={vi.fn()} onActivate={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('mention autocomplete in the composer', () => {
  it('opens on @ and filters as the person keeps typing', async () => {
    render(<Harness />);

    await userEvent.type(composer(), '@');
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await userEvent.type(composer(), 'bo');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveAccessibleName('@bob · Борис');
  });

  it('walks the list with arrows and inserts the chosen nickname on Enter', async () => {
    render(<Harness />);

    await userEvent.type(composer(), 'Привет @');
    fireEvent.keyDown(composer(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(composer(), { key: 'Enter' });

    expect(composer()).toHaveValue('Привет @bob ');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('wraps around at the ends of the list', async () => {
    render(<Harness />);

    await userEvent.type(composer(), '@');
    fireEvent.keyDown(composer(), { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(composer(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('inserts on Tab as well', async () => {
    render(<Harness />);

    await userEvent.type(composer(), '@ali');
    fireEvent.keyDown(composer(), { key: 'Tab' });

    expect(composer()).toHaveValue('@alice ');
  });

  it('closes on Escape and does not reopen until the text changes', async () => {
    render(<Harness />);

    await userEvent.type(composer(), '@bo');
    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(screen.queryByRole('option')).toBeNull();

    await userEvent.type(composer(), 'b');
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('keeps the text around the caret when inserting', async () => {
    render(<Harness />);

    const field = composer();
    await userEvent.type(field, 'кто тут? спросил я');
    // Каретка возвращается внутрь строки — упоминание встаёт именно туда.
    await userEvent.type(field, '@bo', { initialSelectionStart: 9, initialSelectionEnd: 9 });
    await userEvent.click(screen.getByRole('option', { name: '@bob · Борис' }));

    expect(composer()).toHaveValue('кто тут? @bob спросил я');
  });

  it('sends the chosen mention along with the message', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    await userEvent.type(composer(), '@ali');
    fireEvent.keyDown(composer(), { key: 'Enter' });
    await userEvent.type(composer(), 'привет{Enter}');

    expect(onSend).toHaveBeenCalledWith({
      body: '@alice привет',
      reply_to_id: null,
      mentions: ['u-alice'],
    });
  });

  it('sends the message with Enter when no candidate list is open', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSend={onSend} />);

    await userEvent.type(composer(), 'просто текст{Enter}');

    expect(onSend).toHaveBeenCalledWith({
      body: 'просто текст',
      reply_to_id: null,
      mentions: undefined,
    });
  });
});

describe('mentions rendered in the feed', () => {
  const message = (extra: Partial<Message> = {}): Message => ({
    id: 'm1',
    room_id: 'r1',
    kind: 'text',
    author_id: 'u-bob',
    author_name: 'Борис',
    author_avatar_url: null,
    reply_to_id: null,
    body: 'привет @alice и @nick',
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

  const usernames = new Map([
    ['u-alice', 'alice'],
    ['u-bob', 'bob'],
    ['u-nick', 'nick'],
  ]);

  const bubble = (extra: Partial<React.ComponentProps<typeof MessageBubble>> = {}) =>
    render(
      <MessageBubble
        message={message()}
        reply={null}
        replyAuthor=""
        own={false}
        first
        last
        theme={LIGHT}
        fontSize={16}
        highlighted={false}
        usernames={usernames}
        currentUserId="u-alice"
        onReply={vi.fn()}
        onQuickReaction={vi.fn()}
        onOpenActions={vi.fn()}
        onToggleReaction={vi.fn()}
        onJump={vi.fn()}
        {...extra}
      />,
    );

  it('turns every @tag into a badge and keeps the surrounding text', () => {
    bubble();

    const badges = screen.getAllByText(/^@(alice|nick)$/);
    expect(badges).toHaveLength(2);
    expect(badges[0]!.tagName).toBe('MARK');
    expect(screen.getByLabelText('Сообщение m1')).toHaveTextContent('привет @alice и @nick');
  });

  it('marks the bubble when the reader is mentioned', () => {
    const { container: withMention } = bubble({ message: message({ mentions: ['u-alice'] }) });
    const marked = withMention.querySelector('[data-message-id="m1"]') as HTMLElement;

    expect(marked.style.boxShadow).toContain('inset');
  });

  it('leaves the bubble plain when someone else is mentioned', () => {
    const { container } = bubble({ message: message({ mentions: ['u-nick'] }) });
    const plain = container.querySelector('[data-message-id="m1"]') as HTMLElement;

    expect(plain.style.boxShadow).toBe('none');
  });

  it('says nothing about mentions of a deleted message', () => {
    const { container } = bubble({ message: message({ deleted: true, body: null, mentions: [] }) });

    expect(screen.queryByText('@alice')).toBeNull();
    expect((container.querySelector('[data-message-id="m1"]') as HTMLElement).style.boxShadow).toBe('none');
  });
});
