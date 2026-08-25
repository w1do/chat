import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatProvider } from '../src/adapters/ChatProvider';
import { useRoomActions } from '../src/hooks/useRooms';
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
  ...extra,
});

function setup(client: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['chat', 'rooms', 'r1'], room());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatProvider client={client as never}>{children}</ChatProvider>
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useRoomActions('r1'), { wrapper });

  return { queryClient, result };
}

describe('useRoomActions', () => {
  it('shows the new name everywhere without a reload', async () => {
    const patch = vi.fn().mockResolvedValue({ data: room({ name: 'Семья', topic: 'Вся семья' }) });
    const { queryClient, result } = setup({ patch });

    await result.current.update.mutateAsync({ name: 'Семья', topic: 'Вся семья' });

    expect(patch).toHaveBeenCalledWith('/rooms/r1', { body: { name: 'Семья', topic: 'Вся семья' } });

    // Шапка комнаты читает этот кэш — она обновится сама.
    await waitFor(() =>
      expect(queryClient.getQueryData<Room>(['chat', 'rooms', 'r1'])?.name).toBe('Семья'),
    );
    // Список комнат перечитывается: там то же название.
    expect(queryClient.getQueryState(['chat', 'rooms'])?.isInvalidated ?? true).toBe(true);
  });

  it('forgets a deleted room instead of keeping its ghost', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const { queryClient, result } = setup({ delete: remove });
    queryClient.setQueryData(['chat', 'messages', 'r1'], { pages: [], pageParams: [] });

    await result.current.remove.mutateAsync();

    expect(remove).toHaveBeenCalledWith('/rooms/r1');
    await waitFor(() => expect(queryClient.getQueryData(['chat', 'rooms', 'r1'])).toBeUndefined());
    expect(queryClient.getQueryData(['chat', 'messages', 'r1'])).toBeUndefined();
  });
});
