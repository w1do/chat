import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { RoomsScreen } from '../src/components/mobile/RoomsScreen';
import type { Room } from '../src/schemas/room';

const room = (id: string, name: string, extra: Partial<Room> = {}): Room => ({
  id,
  name,
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T12:00:00Z',
  my_role: 'member',
  member_count: 2,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
  ...extra,
});

const handlers = {
  onOpen: vi.fn(),
  onRetry: vi.fn(),
  onProfile: vi.fn(),
  onCreateRoom: vi.fn().mockResolvedValue(undefined),
  onStartConversation: vi.fn().mockResolvedValue(undefined),
};

const base = {
  theme: LIGHT,
  currentUser: { id: 'me', name: 'Alice' },
  ...handlers,
};

describe('RoomsScreen', () => {
  it('shows the loading state', () => {
    render(<RoomsScreen rooms={undefined} isLoading {...base} />);

    expect(screen.getByText('Загрузка комнат…')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the empty state', () => {
    render(<RoomsScreen rooms={[]} isLoading={false} {...base} />);

    expect(screen.getByRole('status')).toHaveTextContent('Комнат пока нет');
  });

  it('shows the error state and retries', async () => {
    const onRetry = vi.fn();
    render(<RoomsScreen rooms={undefined} isLoading={false} error={new Error('x')} {...base} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить комнаты.');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders unread badges and opens a room with the keyboard', async () => {
    const onOpen = vi.fn();
    render(
      <RoomsScreen
        rooms={[room('r1', 'Общая', { unread_count: 3 }), room('r2', 'Закрытая', { visibility: 'private' })]}
        isLoading={false}
        {...base}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByLabelText('Непрочитанных: 3')).toHaveTextContent('3');

    // Комната открывается с клавиатуры; порядок табуляции — шапка, затем список.
    screen.getByRole('button', { name: /Общая/ }).focus();
    await userEvent.keyboard('{Enter}');

    expect(onOpen).toHaveBeenCalledWith('r1');
  });

  it('creates a room through the collapsible form', async () => {
    const onCreateRoom = vi.fn().mockResolvedValue(undefined);
    render(<RoomsScreen rooms={[room('r1', 'Общая')]} isLoading={false} {...base} onCreateRoom={onCreateRoom} />);

    await userEvent.click(screen.getByRole('button', { name: 'Новая комната' }));
    await userEvent.type(screen.getByLabelText('Название'), 'Поездки');
    await userEvent.selectOptions(screen.getByLabelText('Видимость'), 'private');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onCreateRoom).toHaveBeenCalledWith({ name: 'Поездки', visibility: 'private' });
  });

  it('reports an error when room creation fails', async () => {
    const onCreateRoom = vi.fn().mockRejectedValue(new Error('nope'));
    render(<RoomsScreen rooms={[]} isLoading={false} {...base} onCreateRoom={onCreateRoom} />);

    await userEvent.click(screen.getByRole('button', { name: 'Новая комната' }));
    await userEvent.type(screen.getByLabelText('Название'), 'Поездки');
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось создать комнату.');
  });

  it('renders a mixed list with a direct message: counterpart name, mention and unread', async () => {
    const onOpen = vi.fn();
    const dm: Room = room('d1', null, {
      kind: 'direct',
      counterpart: { id: 'u2', username: 'bob', name: 'Bob Builder', avatar_url: null },
      unread_count: 5,
      member_count: null,
    });

    render(
      <RoomsScreen
        rooms={[room('r1', 'Общая'), dm]}
        isLoading={false}
        {...base}
        onOpen={onOpen}
      />,
    );

    // Подпись диалога — имя собеседника, а не название комнаты
    expect(screen.getByRole('button', { name: /Bob Builder/ })).toBeInTheDocument();
    // Подстрока показывает ник и что это личная переписка
    expect(screen.getByText('@bob · личная переписка')).toBeInTheDocument();
    // Бейдж непрочитанного отображается
    expect(screen.getByLabelText('Непрочитанных: 5')).toHaveTextContent('5');
    // Для диалога не показывается счётчик участников (иконка и число)
    expect(screen.queryByText(/👤/)).toBeInTheDocument(); // для комнаты есть
    // но рядом с «Bob Builder» отдельного счётчика участников быть не должно
    expect(
      screen
        .getByRole('button', { name: /Bob Builder/ })
        .querySelector('[aria-label="Непрочитанных: 5"]')
    ).toBeTruthy();

    // Список — ровно то, что пришло от сервера: чужих диалогов в нём нет.
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/Carol/)).toBeNull();
  });
});
