import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('../src/app/api', () => ({ apiClient: () => ({ get, post }) }));
vi.mock('../src/app/settings', () => ({ useSettings: () => ({ settings: { theme: 'light' } }) }));

const currentUser: { value: { id: string; name: string } | null } = { value: null };
vi.mock('@vendor/identity', async () => {
  const actual = await vi.importActual<typeof import('@vendor/identity')>('@vendor/identity');

  return { ...actual, useAuth: () => ({ user: currentUser.value }) };
});

import { createInvite, inviteMessage } from '../src/app/invite';
import { InvitePage } from '../src/pages/InvitePage';

const invite = {
  id: 'i1',
  room_id: 'r1',
  room_name: 'Семья',
  invited_by_name: 'Алексей',
  expires_at: '2026-09-01T10:00:00Z',
  token: 'secret-token',
};

function renderInvitePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/invite/secret-token']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  render(
    <Routes>
      <Route path="/invite/:token" element={<InvitePage />} />
    </Routes>,
    { wrapper },
  );
}

describe('приглашение', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    currentUser.value = null;
  });

  it('собирает понятный текст со ссылкой и сроком', () => {
    const text = inviteMessage('Семья', 'abc', '2026-09-01T10:00:00Z');

    expect(text).toContain('Приглашаю тебя в чат «Семья»');
    expect(text).toContain(`${window.location.origin}/invite/abc`);
    expect(text).toContain('действует до');
  });

  it('копирует приглашение в буфер', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    post.mockResolvedValue({ data: invite });

    const result = await createInvite('r1', 'Семья');

    expect(post).toHaveBeenCalledWith('/rooms/r1/invites');
    expect(writeText).toHaveBeenCalled();
    expect(result.copied).toBe(true);
  });

  it('отдаёт ссылку, когда буфер недоступен', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    post.mockResolvedValue({ data: invite });

    const result = await createInvite('r1', 'Семья');

    expect(result.copied).toBe(false);
    expect(result.link).toContain('/invite/secret-token');
  });

  it('спрашивает имя у гостя и заводит его в комнату', async () => {
    get.mockResolvedValue({ data: invite });
    post.mockResolvedValue({ data: { room_id: 'r1', created_account: true } });

    renderInvitePage();

    expect(await screen.findByRole('heading', { name: 'Семья' })).toBeInTheDocument();
    expect(screen.getByText(/Алексей приглашает вас в чат/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Как вас зовут?'), 'Надя');
    await userEvent.click(screen.getByRole('button', { name: 'Присоединиться к чату' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/invites/secret-token/accept', { body: { name: 'Надя' } }),
    );
  });

  it('вошедшего только зовёт вступить, имя не спрашивает', async () => {
    currentUser.value = { id: 'u1', name: 'Алексей' };
    get.mockResolvedValue({ data: invite });
    post.mockResolvedValue({ data: { room_id: 'r1', created_account: false } });

    renderInvitePage();

    expect(await screen.findByRole('button', { name: 'Вступить в «Семья»' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Как вас зовут?')).toBeNull();
  });

  it('объясняет недействительную ссылку вместо ошибки', async () => {
    get.mockRejectedValue(new Error('404'));

    renderInvitePage();

    expect(await screen.findByRole('heading', { name: 'Ссылка недействительна' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/отозвали или истёк/);
  });
});
