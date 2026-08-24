import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoomList } from '../src/components/RoomList';
import type { Room } from '../src/schemas/room';

const room = (id: string, name: string, extra: Partial<Room> = {}): Room => ({
  id,
  name,
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T12:00:00Z',
  my_role: null,
  member_count: 2,
  ...extra,
});

describe('RoomList', () => {
  it('shows the loading state', () => {
    render(<RoomList rooms={undefined} isLoading onSelect={() => {}} />);
    expect(screen.getByText('Загрузка комнат…')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the empty state', () => {
    render(<RoomList rooms={[]} isLoading={false} onSelect={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Комнат пока нет');
  });

  it('shows the error state with retry', async () => {
    const onRetry = vi.fn();
    render(<RoomList rooms={undefined} isLoading={false} error={new Error('x')} onSelect={() => {}} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить комнаты.');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('selects a room with the keyboard only', async () => {
    const onSelect = vi.fn();
    render(
      <RoomList
        rooms={[room('r1', 'General'), room('r2', 'Private', { visibility: 'private' })]}
        isLoading={false}
        activeRoomId="r1"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole('button', { name: /General/ })).toHaveAttribute('aria-current', 'true');

    await userEvent.keyboard('{Tab}{Tab}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('r2');
  });
});
