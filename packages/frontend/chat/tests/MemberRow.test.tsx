import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { MemberRow } from '../src/components/mobile/MemberRow';
import type { Member, Room } from '../src/schemas/room';

type RoomRole = NonNullable<Room['my_role']>;

const member = (role: RoomRole, userId: string, name: string): Member => ({
  id: `m-${userId}`,
  room_id: 'r1',
  user_id: userId,
  role,
  joined_at: '2026-08-24T10:00:00Z',
  name,
});

const owner = member('owner', 'u-owner', 'Ольга');
const admin = member('admin', 'u-admin', 'Артём');
const plain = member('member', 'u-plain', 'Пётр');

function setup(target: Member, myRole: RoomRole | null, myUserId: string) {
  const onRemove = vi.fn().mockResolvedValue(undefined);
  const onChangeRole = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();

  render(
    <MemberRow
      member={target}
      myRole={myRole}
      myUserId={myUserId}
      theme={LIGHT}
      onChangeRole={onChangeRole}
      onRemove={onRemove}
      onError={onError}
    />,
  );

  return { onRemove, onChangeRole, onError };
}

const removeAction = (name: string) => screen.queryByRole('button', { name: `Исключить ${name}` });

describe('MemberRow', () => {
  it('offers removal to the owner for everyone but themselves', () => {
    setup(plain, 'owner', 'u-owner');
    expect(removeAction('Пётр')).toBeInTheDocument();

    render(<div />);
    setup(admin, 'owner', 'u-owner');
    expect(removeAction('Артём')).toBeInTheDocument();
  });

  it('never offers the owner their own removal', () => {
    setup(owner, 'owner', 'u-owner');

    expect(removeAction('Ольга')).not.toBeInTheDocument();
  });

  it('lets an admin remove plain members only', () => {
    setup(plain, 'admin', 'u-admin');
    expect(removeAction('Пётр')).toBeInTheDocument();
  });

  it('hides removal of the owner and of another admin from an admin', () => {
    setup(owner, 'admin', 'u-admin');
    expect(removeAction('Ольга')).not.toBeInTheDocument();

    setup(member('admin', 'u-admin-2', 'Аня'), 'admin', 'u-admin');
    expect(removeAction('Аня')).not.toBeInTheDocument();
  });

  it('does not show removal to a plain member at all', () => {
    setup(plain, 'member', 'u-someone');

    expect(removeAction('Пётр')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Сделать админом/ })).not.toBeInTheDocument();
  });

  it('asks before removing and steps back on cancel', async () => {
    const { onRemove } = setup(plain, 'owner', 'u-owner');

    await userEvent.click(removeAction('Пётр')!);
    expect(screen.getByText(/Исключить Пётр из комнаты\?/)).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByText(/Исключить Пётр из комнаты\?/)).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('removes the person once the action is confirmed', async () => {
    const { onRemove } = setup(plain, 'owner', 'u-owner');

    await userEvent.click(removeAction('Пётр')!);
    await userEvent.click(screen.getByRole('button', { name: 'Исключить', exact: true }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('reports a failed removal instead of pretending it worked', async () => {
    const onRemove = vi.fn().mockRejectedValue(new Error('nope'));
    const onError = vi.fn();

    render(
      <MemberRow
        member={plain}
        myRole="owner"
        myUserId="u-owner"
        theme={LIGHT}
        onChangeRole={vi.fn()}
        onRemove={onRemove}
        onError={onError}
      />,
    );

    await userEvent.click(removeAction('Пётр')!);
    await userEvent.click(screen.getByRole('button', { name: 'Исключить', exact: true }));

    expect(onError).toHaveBeenCalledWith('Не удалось исключить участника.');
  });
});
