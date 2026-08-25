import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { typingSummary } from '../src/format';
import type { Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const room: Room = {
  id: 'r1',
  name: 'Семья',
  topic: 'Вся семья',
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 4,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
};

const members: Member[] = [
  { id: 'm1', room_id: 'r1', user_id: 'u1', role: 'owner', joined_at: '', name: 'Алексей', avatar_url: null },
  { id: 'm2', room_id: 'r1', user_id: 'u2', role: 'member', joined_at: '', name: 'Андрей', avatar_url: null },
  { id: 'm3', room_id: 'r1', user_id: 'u3', role: 'member', joined_at: '', name: 'Надя', avatar_url: null },
  { id: 'm4', room_id: 'r1', user_id: 'u4', role: 'member', joined_at: '', name: 'Оля', avatar_url: null },
  { id: 'm5', room_id: 'r1', user_id: 'me', role: 'member', joined_at: '', name: 'Я', avatar_url: null },
];

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Алексей',
  author_avatar_url: null,
  reply_to_id: null,
  body: `Сообщение ${id}`,
  mentions: [],
  edited_at: null,
  deleted: false,
  created_at: new Date().toISOString(),
  reactions: [],
  payload: null,
  ...extra,
});

function Feed(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
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

describe('лента по макету', () => {
  it('подписывает автора у обеих сторон', () => {
    render(
      <Feed
        messages={[message('mine', { author_id: 'me', author_name: 'Я' }), message('theirs')]}
      />,
    );

    expect(screen.getByText('Алексей')).toBeInTheDocument();

    // Своя группа подписана именем и зеркальна: аватар справа от пузырей.
    const ownName = screen
      .getAllByText('Я')
      .find((element) => element.className.includes('font-semibold'));
    expect(ownName).toBeDefined();
    expect(ownName?.closest('.flex.items-end')?.className).toContain('flex-row-reverse');
  });

  it('показывает один аватар на группу подряд идущих сообщений', () => {
    render(<Feed messages={[message('a'), message('b'), message('c')]} />);

    // Имя и аватар — один раз на всю группу, а не у каждого сообщения.
    expect(screen.getAllByText('Алексей')).toHaveLength(1);
    expect(screen.getAllByLabelText(/^Сообщение /)).toHaveLength(3);
  });

  it('отделяет сегодняшние сообщения словом, а не датой', () => {
    render(<Feed messages={[message('a')]} />);

    expect(screen.getByText('Сегодня')).toBeInTheDocument();
  });

  it('называет давнюю дату с днём недели', () => {
    render(<Feed messages={[message('a', { created_at: '2026-08-11T09:00:00Z' })]} />);

    expect(screen.getByText(/августа/)).toBeInTheDocument();
  });
});

describe('оболочка экрана переписки', () => {
  it('держит одну область прокрутки: шапка и панель ввода вне её', () => {
    const { container } = render(<Feed />);

    // У листов есть своя прокрутка — считаем только области самого экрана.
    const areas = [...container.querySelectorAll('.scroll-area')].filter(
      (area) => area.closest('[role="dialog"]') === null,
    );
    expect(areas).toHaveLength(1);

    const feed = areas[0]!;
    // Лента прокручивается, края — нет.
    expect(feed).toContainElement(screen.getByLabelText('Сообщение m1'));
    expect(feed).not.toContainElement(screen.getByRole('banner'));
    expect(feed).not.toContainElement(screen.getByRole('textbox', { name: 'Сообщение' }));
  });

  it('не полагается на абсолютное позиционирование краёв', () => {
    const { container } = render(<Feed />);

    const header = container.querySelector('header')!;
    const composer = screen.getByRole('textbox', { name: 'Сообщение' }).closest('div[class*="blur-chrome"]')!;

    expect(header.className).not.toContain('absolute');
    expect(composer.className).not.toContain('absolute');
  });

  it('прокручивает ленту к новому сообщению, не двигая интерфейс', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as never;

    const { rerender } = render(<Feed messages={[message('m1')]} />);
    scrollTo.mockClear();

    rerender(<Feed messages={[message('m2'), message('m1')]} />);

    expect(scrollTo).toHaveBeenCalled();
    expect(window.scrollY).toBe(0);
  });
});

describe('подсказка о жестах', () => {
  it('появляется один раз и запоминается', async () => {
    window.localStorage.clear();

    const { unmount } = render(<Feed />);
    const hint = screen.getByRole('button', { name: /Потяните сообщение влево/ });

    await userEvent.click(hint);
    expect(screen.queryByRole('button', { name: /Потяните сообщение влево/ })).toBeNull();

    unmount();
    render(<Feed />);
    expect(screen.queryByRole('button', { name: /Потяните сообщение влево/ })).toBeNull();
  });
});

describe('«печатает» в шапке', () => {
  it('сворачивает список по-человечески', () => {
    expect(typingSummary([])).toBeNull();
    expect(typingSummary(['Алексей'])).toBe('Алексей печатает…');
    expect(typingSummary(['Алексей', 'Андрей'])).toBe('Алексей и Андрей печатают…');
    expect(typingSummary(['Алексей', 'Андрей', 'Надя'])).toBe('Алексей, Андрей и Надя печатают…');
    expect(typingSummary(['Алексей', 'Андрей', 'Надя', 'Оля'])).toBe(
      'Алексей, Андрей, Надя и ещё 1 печатают…',
    );
  });

  it('живёт в шапке, а не в ленте', () => {
    render(<Feed typingUserIds={['u1', 'u2', 'u3', 'u4']} />);

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('status')).toHaveTextContent(
      'Алексей, Андрей, Надя и ещё 1 печатают…',
    );
    // Описание комнаты подменяется, лента остаётся без индикатора.
    expect(within(header).queryByText('Вся семья')).toBeNull();
  });

  it('уважает выключенную настройку', () => {
    render(<Feed typingUserIds={['u1']} showTyping={false} />);

    expect(screen.queryByText(/печатает/)).toBeNull();
  });

  it('объявляет сообщение и его реакции скринридеру', () => {
    render(
      <Feed
        messages={[message('m1', { reactions: [{ emoji: '👍', count: 2, reacted_by_me: false }] })]}
      />,
    );

    expect(screen.getByLabelText('Сообщение m1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Реакции: 2' })).toBeInTheDocument();
  });
});
