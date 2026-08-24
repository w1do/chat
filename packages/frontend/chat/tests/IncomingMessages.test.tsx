import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConnectionState, PresenceEvent, RealtimeAdapter, RoomEvent } from '../src/index';
import { useIncomingMessages, type IncomingMessage } from '../src/hooks/useIncomingMessages';

class FakeAdapter implements RealtimeAdapter {
  handlers = new Map<string, (event: RoomEvent) => void>();

  subscribeRoom(roomId: string, onEvent: (event: RoomEvent) => void) {
    this.handlers.set(roomId, onEvent);

    return { unsubscribe: () => this.handlers.delete(roomId) };
  }

  subscribePresence(_roomId: string, _handlers: { onEvent: (event: PresenceEvent) => void }) {
    return { unsubscribe: () => {} };
  }

  onConnectionChange(_listener: (state: ConnectionState) => void) {
    return () => {};
  }

  emitMessage(roomId: string, authorId: string, kind: 'text' | 'system' = 'text'): void {
    this.handlers.get(roomId)?.({
      event: 'message.created.v1',
      version: 1,
      room_id: roomId,
      occurred_at: '2026-08-24T12:00:00Z',
      data: {
        id: `m-${Math.random()}`,
        kind,
        author: { id: authorId, name: 'Bob' },
        body: 'Новое сообщение',
        payload: kind === 'system' ? { event: 'member.joined', actor_id: authorId } : null,
        reply_to_id: null,
        created_at: '2026-08-24T12:00:00Z',
      },
    });
  }
}

function setup(activeRoomId?: string, visibility: DocumentVisibilityState = 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: visibility, configurable: true });

  const adapter = new FakeAdapter();
  const notices: IncomingMessage[] = [];

  function Probe() {
    useIncomingMessages(adapter, {
      rooms: new Map([
        ['r1', 'Общая'],
        ['r2', 'Кухня'],
      ]),
      currentUserId: 'me',
      activeRoomId,
      onNotice: (message) => notices.push(message),
    });

    return null;
  }

  render(<Probe />);

  return { adapter, notices };
}

describe('useIncomingMessages', () => {
  it('raises a notice for a message in another room', () => {
    const { adapter, notices } = setup('r1');

    adapter.emitMessage('r2', 'u-bob');

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ roomId: 'r2', roomName: 'Кухня', authorName: 'Bob' });
  });

  it('stays silent for the open focused room', () => {
    const { adapter, notices } = setup('r1');

    adapter.emitMessage('r1', 'u-bob');

    expect(notices).toHaveLength(0);
  });

  it('notifies about the open room when the tab is in the background', () => {
    const { adapter, notices } = setup('r1', 'hidden');

    adapter.emitMessage('r1', 'u-bob');

    expect(notices).toHaveLength(1);
  });

  it('stays silent for own messages and system entries', () => {
    const { adapter, notices } = setup('r1');

    adapter.emitMessage('r2', 'me');
    adapter.emitMessage('r2', 'u-bob', 'system');

    expect(notices).toHaveLength(0);
  });
});
