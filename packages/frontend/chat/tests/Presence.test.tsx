import { render, screen } from '@testing-library/react';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { MemberRow } from '../src/components/mobile/MemberRow';
import { PresenceDots } from '../src/components/PresenceDots';
import { formatLastSeen } from '../src/format';
import type { Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const now = new Date('2026-08-27T15:00:00Z');

/** Метки строятся в местном времени: «вчера» зависит от часового пояса читателя. */
function local(daysAgo: number, hours: number, minutes: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);

  return date;
}

const at = (date: Date): string => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

describe('formatLastSeen', () => {
  it('says the person is online instead of the exact moment', () => {
    expect(formatLastSeen('2026-08-27T14:59:00Z', { online: true, now })).toBe('В сети');
  });

  it('rounds the freshest activity to «только что»', () => {
    expect(formatLastSeen('2026-08-27T14:59:30Z', { now })).toBe('был(а) в сети только что');
  });

  it('counts minutes within the hour', () => {
    expect(formatLastSeen('2026-08-27T14:35:00Z', { now })).toBe('был(а) в сети 25 мин назад');
  });

  it('falls back to the time of day later the same day', () => {
    const seen = local(0, 2, 0);
    expect(formatLastSeen(seen.toISOString(), { now })).toBe(`был(а) в сети сегодня в ${at(seen)}`);
  });

  it('names yesterday', () => {
    const seen = local(1, 19, 15);
    expect(formatLastSeen(seen.toISOString(), { now })).toBe(`был(а) в сети вчера в ${at(seen)}`);
  });

  it('gives the date for older activity', () => {
    const seen = local(20, 12, 0);
    const date = seen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    expect(formatLastSeen(seen.toISOString(), { now })).toBe(`был(а) в сети ${date} в ${at(seen)}`);
  });

  it('keeps the year when the activity is from another one', () => {
    expect(formatLastSeen(local(300, 12, 0).toISOString(), { now })).toContain('2025 г.');
  });

  it('does not invent a moment it does not know', () => {
    expect(formatLastSeen(null, { now })).toBe('был(а) в сети давно');
    expect(formatLastSeen('не дата', { now })).toBe('был(а) в сети давно');
  });
});


const member = (extra: Partial<Member> = {}): Member => ({
  id: 'm-bob',
  room_id: 'r1',
  user_id: 'u-bob',
  role: 'member',
  joined_at: '2026-08-24T10:00:00Z',
  name: 'Боб',
  username: 'bob',
  avatar_url: null,
  is_online: false,
  last_seen_at: null,
  ...extra,
});

const room = (extra: Partial<Room> = {}): Room => ({
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 3,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
  ...extra,
});

const message: Message = {
  id: 'm1',
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Алиса',
  author_avatar_url: null,
  reply_to_id: null,
  body: 'Привет',
  mentions: [],
  is_edited: false,
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  attachments: [],
  payload: null,
};

function renderChat(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  render(
    <ChatScreen
      room={room()}
      messages={[message]}
      members={[member()]}
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
      draft=""
      onDraftChange={vi.fn()}
      onSend={async () => undefined}
      onBack={vi.fn()}
      onLoadMore={vi.fn()}
      onTyping={vi.fn()}
      onToggleReaction={vi.fn()}
      onDeleteMessage={vi.fn()}
      onMagic={vi.fn()}
      onUndoMagic={vi.fn()}
      {...props}
    />,
  );
}

function renderMember(target: Member, present = false) {
  render(
    <MemberRow
      member={target}
      present={present}
      myRole="member"
      myUserId="me"
      theme={LIGHT}
      onChangeRole={vi.fn().mockResolvedValue(undefined)}
      onRemove={vi.fn().mockResolvedValue(undefined)}
      onError={vi.fn()}
    />,
  );
}

describe('presence in the member list', () => {
  it('shows the role together with the online status', () => {
    renderMember(member({ is_online: true, last_seen_at: new Date().toISOString() }));

    expect(screen.getByText('участник · В сети')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'в сети' })).toBeInTheDocument();
  });

  it('shows when an offline member was last seen', () => {
    const seen = new Date(Date.now() - 25 * 60_000).toISOString();
    renderMember(member({ is_online: false, last_seen_at: seen }));

    expect(screen.getByText('участник · был(а) в сети 25 мин назад')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'в сети' })).toBeNull();
  });

  it('trusts the presence channel over the slower API mark', () => {
    renderMember(member({ is_online: false, last_seen_at: null }), true);

    expect(screen.getByText('участник · В сети')).toBeInTheDocument();
  });
});

describe('presence in the chat header', () => {
  it('says the counterpart is online in a direct conversation', () => {
    renderChat({
      room: room({
        kind: 'direct',
        name: null,
        counterpart: {
          id: 'u-bob',
          username: 'bob',
          name: 'Боб',
          avatar_url: null,
          is_online: true,
          last_seen_at: new Date().toISOString(),
        },
      }),
    });

    expect(screen.getByText('В сети')).toBeInTheDocument();
  });

  it('falls back to the last seen moment when the counterpart is away', () => {
    const seen = new Date(Date.now() - 10 * 60_000).toISOString();
    renderChat({
      room: room({
        kind: 'direct',
        name: null,
        counterpart: {
          id: 'u-bob',
          username: 'bob',
          name: 'Боб',
          avatar_url: null,
          is_online: false,
          last_seen_at: seen,
        },
      }),
    });

    expect(screen.getByText('был(а) в сети 10 мин назад')).toBeInTheDocument();
  });

  it('counts who is in the room right now, without counting the reader', () => {
    renderChat({ presentUserIds: ['me', 'u-bob'] });

    expect(screen.getByText('3 участников · вы участник · 1 в сети')).toBeInTheDocument();
  });
});

describe('PresenceDots', () => {
  it('lists who is in the room and folds the rest', () => {
    render(
      <PresenceDots
        theme={LIGHT}
        max={2}
        members={[
          { id: 'u1', name: 'Алиса' },
          { id: 'u2', name: 'Боб' },
          { id: 'u3', name: 'Вера' },
        ]}
      />,
    );

    expect(screen.getByRole('list', { name: 'Сейчас в комнате: 3' })).toBeInTheDocument();
    expect(screen.getByText('Алиса')).toBeInTheDocument();
    expect(screen.getByText('ещё 1')).toBeInTheDocument();
    expect(screen.queryByText('Вера')).toBeNull();
  });

  it('stays out of the way when nobody is connected', () => {
    const { container } = render(<PresenceDots theme={LIGHT} members={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
