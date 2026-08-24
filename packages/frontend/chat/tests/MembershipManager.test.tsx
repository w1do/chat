import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MembershipManager } from '../src/components/MembershipManager';
import type { Member } from '../src/schemas/room';

const member = (id: string, role: Member['role'], name: string): Member => ({
  id,
  room_id: 'r1',
  user_id: `u-${id}`,
  role,
  joined_at: '2026-08-24T12:00:00Z',
  name,
});

const noop = () => Promise.resolve();

describe('MembershipManager', () => {
  it('shows loading and error states', () => {
    const { rerender } = render(
      <MembershipManager members={undefined} isLoading myRole="member" onInvite={noop} onChangeRole={noop} onLeave={noop} />,
    );
    expect(screen.getByText('Загрузка участников…')).toBeInTheDocument();

    rerender(
      <MembershipManager members={undefined} isLoading={false} error={new Error('x')} myRole="member" onInvite={noop} onChangeRole={noop} onLeave={noop} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('lets owner invite and change roles', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onChangeRole = vi.fn().mockResolvedValue(undefined);
    render(
      <MembershipManager
        members={[member('m1', 'owner', 'Alice'), member('m2', 'member', 'Bob')]}
        isLoading={false}
        myRole="owner"
        onInvite={onInvite}
        onChangeRole={onChangeRole}
        onLeave={noop}
      />,
    );

    await userEvent.type(screen.getByLabelText('ID пользователя'), 'user-ulid');
    await userEvent.click(screen.getByRole('button', { name: 'Пригласить' }));
    expect(onInvite).toHaveBeenCalledWith('user-ulid');

    await userEvent.click(screen.getByRole('button', { name: 'Сделать админом' }));
    expect(onChangeRole).toHaveBeenCalledWith('m2', 'admin');
  });

  it('hides management controls from plain members but offers leave', async () => {
    const onLeave = vi.fn().mockResolvedValue(undefined);
    render(
      <MembershipManager
        members={[member('m1', 'owner', 'Alice'), member('m2', 'member', 'Bob')]}
        isLoading={false}
        myRole="member"
        onInvite={noop}
        onChangeRole={noop}
        onLeave={onLeave}
      />,
    );

    expect(screen.queryByRole('form', { name: 'invite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Сделать/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Покинуть комнату' }));
    expect(onLeave).toHaveBeenCalled();
  });

  it('shows an error when invite fails', async () => {
    const onInvite = vi.fn().mockRejectedValue(new Error('conflict'));
    render(
      <MembershipManager members={[]} isLoading={false} myRole="admin" onInvite={onInvite} onChangeRole={noop} onLeave={noop} />,
    );

    await userEvent.type(screen.getByLabelText('ID пользователя'), 'x{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось пригласить пользователя.');
  });
});
