import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@vendor/api-client';
import { LIGHT } from '@vendor/ui';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatProvider } from '../src/adapters/ChatProvider';
import { SearchSheet } from '../src/components/mobile/SearchSheet';

const hit = {
  id: 'm-found',
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Алиса',
  author_avatar_url: null,
  reply_to_id: null,
  body: 'рецепт борща',
  mentions: [],
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  payload: null,
};

function renderSheet(get: ReturnType<typeof vi.fn>, onSelect = vi.fn(() => true)) {
  const client = { get } as never;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatProvider client={client}>{children}</ChatProvider>
    </QueryClientProvider>
  );

  render(
    <SearchSheet open roomId="r1" roomName="Общая" theme={LIGHT} onClose={vi.fn()} onSelect={onSelect} />,
    { wrapper },
  );

  return { onSelect };
}

describe('SearchSheet', () => {
  it('does not query until the term is long enough', async () => {
    const get = vi.fn();
    renderSheet(get);

    await userEvent.type(screen.getByLabelText('Что ищем'), 'б');

    expect(get).not.toHaveBeenCalled();
    expect(screen.getByText('Ищем по сообщениям этой комнаты.')).toBeInTheDocument();
  });

  it('shows results scoped to the room and jumps to the message', async () => {
    const get = vi.fn().mockResolvedValue({ data: [hit] });
    const { onSelect } = renderSheet(get);

    await userEvent.type(screen.getByLabelText('Что ищем'), 'борщ');

    expect(await screen.findByText('рецепт борща')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/search/messages', {
      query: { q: 'борщ', room_id: 'r1', limit: undefined },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Перейти к сообщению m-found' }));
    expect(onSelect).toHaveBeenCalledWith('m-found');
  });

  it('says nothing was found instead of showing an empty list', async () => {
    renderSheet(vi.fn().mockResolvedValue({ data: [] }));

    await userEvent.type(screen.getByLabelText('Что ищем'), 'борщ');

    expect(await screen.findByRole('status')).toHaveTextContent('Ничего не нашлось.');
  });

  it('shows the degraded state when the index is unavailable', async () => {
    const error = new ApiError(503, {
      code: 'service_unavailable',
      message: 'Search is temporarily unavailable.',
      details: {},
      trace_id: null,
    });
    renderSheet(vi.fn().mockRejectedValue(error));

    await userEvent.type(screen.getByLabelText('Что ищем'), 'борщ');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Поиск сейчас недоступен — сам чат работает как обычно.',
    );
  });

  it('explains when the found message is outside the loaded history', async () => {
    renderSheet(vi.fn().mockResolvedValue({ data: [hit] }), vi.fn(() => false));

    await userEvent.type(screen.getByLabelText('Что ищем'), 'борщ');
    await userEvent.click(await screen.findByRole('button', { name: 'Перейти к сообщению m-found' }));

    expect(screen.getByRole('status')).toHaveTextContent('Это сообщение ещё не загружено');
  });
});
