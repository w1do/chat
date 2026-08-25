import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { RoomManagePanel } from '../src/components/mobile/RoomManagePanel';
import type { Room } from '../src/schemas/room';

const room = (extra: Partial<Room> = {}): Room => ({
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'private',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'owner',
  member_count: 3,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  ...extra,
});

function setup(extra: Partial<Room> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onDeleted = vi.fn();

  render(
    <RoomManagePanel
      room={room(extra)}
      theme={LIGHT}
      onSave={onSave}
      onDelete={onDelete}
      onDeleted={onDeleted}
    />,
  );

  return { onSave, onDelete, onDeleted };
}

describe('RoomManagePanel', () => {
  it('saves a new name and description', async () => {
    const { onSave } = setup();

    await userEvent.clear(screen.getByLabelText('Название'));
    await userEvent.type(screen.getByLabelText('Название'), 'Семья');
    await userEvent.type(screen.getByLabelText('Описание'), 'Вся семья');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Семья', topic: 'Вся семья' });
    expect(await screen.findByRole('status')).toHaveTextContent('Сохранено.');
  });

  it('refuses an empty name', async () => {
    const { onSave } = setup();

    await userEvent.clear(screen.getByLabelText('Название'));
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Название не может быть пустым');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows nothing to a plain member', () => {
    setup({ my_role: 'member' });

    expect(screen.queryByLabelText('Название')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Удалить комнату' })).toBeNull();
  });

  it('lets an admin edit but never delete', () => {
    setup({ my_role: 'admin' });

    expect(screen.getByLabelText('Название')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить комнату' })).toBeNull();
  });

  it('deletes only after the name is typed exactly', async () => {
    const { onDelete, onDeleted } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Удалить комнату' }));

    const confirmButton = screen.getByRole('button', { name: 'Удалить навсегда' });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Введите название комнаты/), 'Общ');
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Введите название комнаты/), 'ая');
    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
