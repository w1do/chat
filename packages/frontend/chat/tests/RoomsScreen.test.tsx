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
  ...extra,
});

const handlers = {
  onOpen: vi.fn(),
  onRetry: vi.fn(),
  onProfile: vi.fn(),
  onCreateRoom: vi.fn().mockResolvedValue(undefined),
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
});
