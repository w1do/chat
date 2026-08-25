import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatProvider } from '../src/adapters/ChatProvider';
import { InvitePanel } from '../src/components/mobile/InvitePanel';
import type { MemberCandidate } from '../src/schemas/room';

const alice: MemberCandidate = { id: 'u-alice', username: 'alice', name: 'Алиса', already_member: false };
const anna: MemberCandidate = { id: 'u-anna', username: 'anna', name: 'Анна', already_member: true };

function setup(candidates: MemberCandidate[] = [alice]) {
  const get = vi.fn().mockResolvedValue({ data: candidates });
  const onInvite = vi.fn().mockResolvedValue(undefined);
  const onInviteByLink = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatProvider client={{ get } as never}>{children}</ChatProvider>
    </QueryClientProvider>
  );

  render(
    <InvitePanel roomId="r1" theme={LIGHT} onInvite={onInvite} onInviteByLink={onInviteByLink} />,
    { wrapper },
  );

  return { get, onInvite, onInviteByLink };
}

describe('InvitePanel', () => {
  it('asks for a nickname instead of an internal identifier', () => {
    setup();

    expect(screen.getByLabelText('Ник человека')).toHaveAttribute('placeholder', '@ник');
    expect(screen.queryByLabelText('ID пользователя')).not.toBeInTheDocument();
  });

  it('searches by nickname with or without the at sign', async () => {
    const { get } = setup();

    await userEvent.type(screen.getByLabelText('Ник человека'), '@ali');
    expect(await screen.findByText('Алиса')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/rooms/r1/member-candidates', { query: { query: 'ali' } });

    await userEvent.clear(screen.getByLabelText('Ник человека'));
    await userEvent.type(screen.getByLabelText('Ник человека'), 'ali');

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/rooms/r1/member-candidates', { query: { query: 'ali' } }),
    );
    expect(await screen.findByText('@alice')).toBeInTheDocument();
  });

  it('does not search for less than two characters', async () => {
    const { get } = setup();

    await userEvent.type(screen.getByLabelText('Ник человека'), '@a');

    expect(screen.getByText('Введите хотя бы два символа ника.')).toBeInTheDocument();

    // Даём отработать задержке поиска: на сервер он всё равно не пойдёт.
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));

    expect(get).not.toHaveBeenCalled();
    expect(screen.getByText('Введите хотя бы два символа ника.')).toBeInTheDocument();
  });

  it('invites the person picked from the results', async () => {
    const { onInvite } = setup();

    await userEvent.type(screen.getByLabelText('Ник человека'), 'ali');
    await userEvent.click(await screen.findByRole('button', { name: /Алиса/ }));

    expect(onInvite).toHaveBeenCalledWith('u-alice');
  });

  it('offers a link when nobody was found', async () => {
    const { onInviteByLink } = setup([]);

    await userEvent.type(screen.getByLabelText('Ник человека'), 'zzz');

    expect(await screen.findByText(/Никого не нашли/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Пригласить ссылкой' }));
    expect(onInviteByLink).toHaveBeenCalled();
  });

  it('marks people already in the room and refuses to invite them twice', async () => {
    const { onInvite } = setup([anna]);

    await userEvent.type(screen.getByLabelText('Ник человека'), 'ann');

    const row = await screen.findByRole('button', { name: /Анна/ });
    expect(row).toHaveTextContent('уже в комнате');
    expect(row).toBeDisabled();

    await userEvent.click(row);
    expect(onInvite).not.toHaveBeenCalled();
  });
});
