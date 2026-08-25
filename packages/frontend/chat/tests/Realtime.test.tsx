import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type {
  ConnectionState,
  PresenceEvent,
  PresenceMember,
  RealtimeAdapter,
  RoomEvent,
} from '../src/index';
import { useRealtimeRoom } from '../src/hooks/useRealtimeRoom';
import type { MessagePage } from '../src/schemas/message';

class FakeAdapter implements RealtimeAdapter {
  roomHandler: ((event: RoomEvent) => void) | null = null;
  presenceHandlers: {
    onEvent: (event: PresenceEvent) => void;
    onHere?: (members: PresenceMember[]) => void;
  } | null = null;
  connectionListener: ((state: ConnectionState) => void) | null = null;

  subscribeRoom(_roomId: string, onEvent: (event: RoomEvent) => void) {
    this.roomHandler = onEvent;
    return { unsubscribe: () => {} };
  }

  subscribePresence(_roomId: string, handlers: FakeAdapter['presenceHandlers'] & object) {
    this.presenceHandlers = handlers;
    return { unsubscribe: () => {} };
  }

  onConnectionChange(listener: (state: ConnectionState) => void) {
    this.connectionListener = listener;
    return () => {};
  }
}

const initialPage: MessagePage = {
  data: [
    {
      id: 'm1',
      room_id: 'r1',
      author_id: 'u1',
      author_name: 'Alice',
      author_avatar_url: null,
      reply_to_id: null,
      body: 'Existing',
      mentions: [],
      edited_at: null,
      deleted: false,
      created_at: '2026-08-24T11:00:00Z',
      reactions: [],
    },
  ],
  meta: { next_cursor: null },
};

function Probe({ adapter, currentUserId }: { adapter: RealtimeAdapter; currentUserId?: string }) {
  const { connection, typingUserIds, deleted, removed } = useRealtimeRoom(adapter, 'r1', { currentUserId });
  return (
    <div>
      <output aria-label="connection">{connection}</output>
      <output aria-label="typing">{typingUserIds.join(',')}</output>
      <output aria-label="deleted">{deleted ? 'yes' : 'no'}</output>
      <output aria-label="removed">{removed ? 'yes' : 'no'}</output>
    </div>
  );
}

function setup(currentUserId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['chat', 'messages', 'r1'], {
    pages: [initialPage],
    pageParams: [null],
  });
  const adapter = new FakeAdapter();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(<Probe adapter={adapter} currentUserId={currentUserId} />, { wrapper });
  return { queryClient, adapter };
}

const cachedIds = (queryClient: QueryClient): string[] => {
  const data = queryClient.getQueryData<{ pages: MessagePage[] }>(['chat', 'messages', 'r1']);
  return data?.pages.flatMap((page) => page.data.map((m) => m.id)) ?? [];
};

describe('useRealtimeRoom', () => {
  it('closes the room and forgets it when it is deleted', async () => {
    const { queryClient, adapter } = setup();
    queryClient.setQueryData(['chat', 'rooms', 'r1'], { id: 'r1', name: 'Семья' });

    adapter.roomHandler?.({
      event: 'room.deleted.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { name: 'Семья' },
    });

    await waitFor(() => expect(screen.getByLabelText('deleted')).toHaveTextContent('yes'));

    // Кэш комнаты и её переписки не должен пережить саму комнату.
    expect(queryClient.getQueryData(['chat', 'rooms', 'r1'])).toBeUndefined();
    expect(queryClient.getQueryData(['chat', 'messages', 'r1'])).toBeUndefined();
  });

  it('closes the room for the person who was removed from it', async () => {
    const { queryClient, adapter } = setup('u-me');
    queryClient.setQueryData(['chat', 'rooms', 'r1'], { id: 'r1', name: 'Семья' });
    queryClient.setQueryData(['chat', 'rooms', 'r1', 'members'], []);

    // Чужое исключение комнату не закрывает.
    adapter.roomHandler?.({
      event: 'room.member_changed.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { user_id: 'u-someone', action: 'removed', role: null },
    });
    expect(screen.getByLabelText('removed')).toHaveTextContent('no');
    expect(queryClient.getQueryData(['chat', 'rooms', 'r1'])).toBeDefined();

    adapter.roomHandler?.({
      event: 'room.member_changed.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { user_id: 'u-me', action: 'removed', role: null },
    });

    await waitFor(() => expect(screen.getByLabelText('removed')).toHaveTextContent('yes'));

    // Комната больше не читается — её кэш не должен пережить исключение.
    expect(queryClient.getQueryData(['chat', 'rooms', 'r1'])).toBeUndefined();
    expect(queryClient.getQueryData(['chat', 'rooms', 'r1', 'members'])).toBeUndefined();
    expect(queryClient.getQueryData(['chat', 'messages', 'r1'])).toBeUndefined();
    // Список комнат перечитывается: этой комнаты в нём уже не будет.
    expect(queryClient.getQueryState(['chat', 'rooms'])?.isInvalidated ?? true).toBe(true);
  });

  it('applies live message.created events to the query cache', async () => {
    const { queryClient, adapter } = setup();

    adapter.roomHandler?.({
      event: 'message.created.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: '2026-08-24T12:00:00Z',
      data: {
        id: 'm2',
        author: { id: 'u2', name: 'Bob' },
        body: 'Live!',
        reply_to_id: null,
        created_at: '2026-08-24T12:00:00Z',
      },
    });

    await waitFor(() => expect(cachedIds(queryClient)).toEqual(['m2', 'm1']));

    // Повторная доставка того же события не дублирует сообщение.
    adapter.roomHandler?.({
      event: 'message.created.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: '2026-08-24T12:00:00Z',
      data: {
        id: 'm2',
        author: { id: 'u2', name: 'Bob' },
        body: 'Live!',
        reply_to_id: null,
        created_at: '2026-08-24T12:00:00Z',
      },
    });
    expect(cachedIds(queryClient)).toEqual(['m2', 'm1']);
  });

  it('applies edits and deletes to cached messages', async () => {
    const { queryClient, adapter } = setup();

    adapter.roomHandler?.({
      event: 'message.updated.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { id: 'm1', body: 'Edited live', edited_at: '2026-08-24T12:01:00Z' },
    });
    adapter.roomHandler?.({
      event: 'message.deleted.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { id: 'm1', deleted_at: '2026-08-24T12:02:00Z' },
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{ pages: MessagePage[] }>(['chat', 'messages', 'r1']);
      const message = data?.pages[0]?.data[0];
      expect(message?.deleted).toBe(true);
      expect(message?.body).toBeNull();
    });
  });

  it('resyncs over HTTP after a reconnect (missed events reconciliation)', async () => {
    const { queryClient, adapter } = setup();
    const invalidated: unknown[] = [];
    const original = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((filters: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return original(filters as never);
    }) as typeof queryClient.invalidateQueries;

    adapter.connectionListener?.('reconnecting');
    await screen.findByText('reconnecting');

    adapter.connectionListener?.('connected');
    await screen.findByText('connected');

    expect(invalidated).toContainEqual(['chat', 'messages', 'r1']);

    // Повторное "connected" без обрыва — без лишнего ресинка.
    invalidated.length = 0;
    adapter.connectionListener?.('connected');
    expect(invalidated).toHaveLength(0);
  });

  it('tracks typing users from presence events', async () => {
    const { adapter } = setup();

    adapter.presenceHandlers?.onEvent({
      event: 'typing.changed.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { user_id: 'u2', is_typing: true },
    });
    await waitFor(() => expect(screen.getByLabelText('typing')).toHaveTextContent('u2'));

    adapter.presenceHandlers?.onEvent({
      event: 'typing.changed.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: 'x',
      data: { user_id: 'u2', is_typing: false },
    });
    await waitFor(() => expect(screen.getByLabelText('typing')).toHaveTextContent(''));
  });
});
