import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatProvider } from '../src/adapters/ChatProvider';
import { InvitePanel, InviteSheet, TAP_TARGET } from '../src/components/mobile/InvitePanel';
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


const crowd: MemberCandidate[] = Array.from({ length: 30 }, (_, index) => ({
  id: `u-${index}`,
  username: `annie${index}`,
  name: `Аня ${index}`,
  already_member: false,
}));

/** Лист приглашения: та же обвязка запросов, что у карточки. */
function setupSheet(candidates: MemberCandidate[] = [alice]) {
  const get = vi.fn().mockResolvedValue({ data: candidates });
  const onInvite = vi.fn().mockResolvedValue(undefined);
  const onInviteByLink = vi.fn();
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatProvider client={{ get } as never}>{children}</ChatProvider>
    </QueryClientProvider>
  );

  render(
    <InviteSheet
      open
      onClose={onClose}
      roomId="r1"
      theme={LIGHT}
      onInvite={onInvite}
      onInviteByLink={onInviteByLink}
    />,
    { wrapper },
  );

  return { get, onInvite, onInviteByLink, onClose };
}

/** Прокручиваемая середина листа — та самая, внутри которой живёт список. */
function scrollRegion(): HTMLElement {
  const region = document.querySelector('.scroll-area');
  if (!(region instanceof HTMLElement)) throw new Error('лист без области прокрутки');

  return region;
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

describe('InviteSheet', () => {
  it('opens as a dialog that fits the screen and keeps the search field in view', () => {
    setupSheet();

    expect(screen.getByRole('dialog', { name: 'Пригласить человека' })).toBeInTheDocument();

    // Поле поиска липнет к верхнему краю прокрутки: список уходит под него,
    // а не уносит его с собой.
    const search = screen.getByTestId('invite-search');
    expect(search).toHaveClass('sticky');
    expect(search).toHaveClass('top-0');
    expect(scrollRegion()).toContainElement(search);
  });

  it('scrolls a long list while the actions stay outside the scroll region', async () => {
    const { onInviteByLink, onClose } = setupSheet(crowd);

    await userEvent.type(screen.getByLabelText('Ник человека'), 'ann');
    expect(await screen.findByText('Аня 29')).toBeInTheDocument();

    // Список прокручивается внутри листа…
    expect(scrollRegion()).toContainElement(screen.getByText('Аня 29'));

    // …а кнопки лежат в закреплённой панели и прокруткой не уезжают.
    const footer = screen.getByTestId('sheet-footer');
    expect(scrollRegion()).not.toContainElement(footer);

    await userEvent.click(within(footer).getByRole('button', { name: 'Пригласить ссылкой' }));
    expect(onInviteByLink).toHaveBeenCalled();

    await userEvent.click(within(footer).getByRole('button', { name: 'Готово' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not offer the link twice when nobody was found', async () => {
    setupSheet([]);

    await userEvent.type(screen.getByLabelText('Ник человека'), 'zzz');
    expect(await screen.findByText(/Никого не нашли/)).toBeInTheDocument();

    // Приглашение ссылкой живёт только в панели действий.
    expect(screen.getAllByRole('button', { name: 'Пригласить ссылкой' })).toHaveLength(1);
  });

  it('gives every control a finger-sized target', async () => {
    setupSheet();

    expect(screen.getByLabelText('Ник человека')).toHaveStyle({ minHeight: `${TAP_TARGET}px` });

    await userEvent.type(screen.getByLabelText('Ник человека'), 'ali');
    expect(await screen.findByRole('button', { name: /Алиса/ })).toHaveStyle({
      minHeight: `${TAP_TARGET}px`,
    });

    const footer = screen.getByTestId('sheet-footer');
    for (const name of ['Пригласить ссылкой', 'Готово']) {
      expect(within(footer).getByRole('button', { name })).toHaveStyle({ minHeight: `${TAP_TARGET}px` });
    }
  });
});
