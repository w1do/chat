import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatProvider } from '../src/adapters/ChatProvider';
import {
  ROOMS_REFETCH_INTERVAL,
  useHideConversation,
  useRooms,
  useStartConversation,
} from '../src/hooks/useRooms';
import type { Room } from '../src/schemas/room';

const room = (id: string, name: string | null, extra: Partial<Room> = {}): Room => ({
  id,
  name,
  topic: null,
  visibility: 'private',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 2,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
  ...extra,
});

const direct = (id: string, unread = 0): Room =>
  room(id, null, {
    kind: 'direct',
    member_count: null,
    unread_count: unread,
    counterpart: { id: 'u2', username: 'bob', name: 'Bob Builder', avatar_url: null },
  });

function wrapperFor(client: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatProvider client={client as never}>{children}</ChatProvider>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('личные переписки в списке', () => {
  it('скрытие убирает диалог из списка, а новое сообщение возвращает его', async () => {
    // Сервер отдаёт список: сначала с диалогом, после скрытия — без него,
    // а с новым сообщением диалог возвращается с прежней историей.
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: [room('r1', 'Общая'), direct('d1')] })
      .mockResolvedValueOnce({ data: [room('r1', 'Общая')] })
      .mockResolvedValue({ data: [room('r1', 'Общая'), direct('d1', 1)] });
    const post = vi.fn().mockResolvedValue(undefined);
    const { queryClient, wrapper } = wrapperFor({ get, post });

    const list = renderHook(() => useRooms(), { wrapper });
    const hide = renderHook(() => useHideConversation(), { wrapper });

    await waitFor(() => expect(list.result.current.data).toHaveLength(2));

    await hide.result.current.mutateAsync('d1');

    expect(post).toHaveBeenCalledWith('/direct-conversations/d1/hide');
    // Список перечитан: диалога в нём больше нет, но переписка не удалена.
    await waitFor(() => expect(list.result.current.data?.map((item) => item.id)).toEqual(['r1']));

    // Новое сообщение — список перечитывается сам (события приходят только по
    // комнатам из списка, поэтому у него есть период) и диалог снова на месте.
    expect(ROOMS_REFETCH_INTERVAL).toBeGreaterThan(0);
    await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });

    await waitFor(() => {
      const dialog = list.result.current.data?.find((item) => item.id === 'd1');
      expect(dialog?.counterpart?.name).toBe('Bob Builder');
      expect(dialog?.unread_count).toBe(1);
    });
  });

  it('в списке только те переписки, что отдал сервер: чужих диалогов нет', async () => {
    const get = vi.fn().mockResolvedValue({ data: [room('r1', 'Общая'), direct('d1')] });
    const { wrapper } = wrapperFor({ get });

    const { result } = renderHook(() => useRooms(), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    // Клиент не додумывает переписки: список ровно тот, что пришёл, поэтому
    // чужой диалог в него попасть не может.
    expect(result.current.data?.map((item) => item.id)).toEqual(['r1', 'd1']);
    expect(get).toHaveBeenCalledWith('/rooms', { query: {} });
  });

  it('повторное начало переписки открывает ту же, а не вторую', async () => {
    const post = vi.fn().mockResolvedValue({ data: direct('d1') });
    const { queryClient, wrapper } = wrapperFor({ post });

    const { result } = renderHook(() => useStartConversation(), { wrapper });

    const first = await result.current.mutateAsync('u2');
    const second = await result.current.mutateAsync('u2');

    expect(post).toHaveBeenCalledWith('/direct-conversations', { body: { user_id: 'u2' } });
    expect(second.id).toBe(first.id);
    // Открытая переписка уже в кэше: экран показывает её без второго запроса.
    await waitFor(() => expect(queryClient.getQueryData<Room>(['chat', 'rooms', 'd1'])?.id).toBe('d1'));
  });
});
