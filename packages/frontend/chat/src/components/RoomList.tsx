import type { Room } from '../schemas/room';

interface RoomListProps {
  rooms: Room[] | undefined;
  isLoading: boolean;
  error?: unknown;
  activeRoomId?: string;
  onSelect: (roomId: string) => void;
  onRetry?: () => void;
}

/** Список комнат: состояния loading / error / empty, навигация с клавиатуры. */
export function RoomList({ rooms, isLoading, error, activeRoomId, onSelect, onRetry }: RoomListProps) {
  if (isLoading) {
    return <p aria-busy="true">Загрузка комнат…</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>Не удалось загрузить комнаты.</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return <p role="status">Комнат пока нет — создайте первую.</p>;
  }

  return (
    <nav aria-label="Комнаты">
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              aria-current={room.id === activeRoomId ? 'true' : undefined}
            >
              {room.name}
              {room.visibility === 'private' ? ' 🔒' : ''}
              {room.member_count != null ? ` (${room.member_count})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
