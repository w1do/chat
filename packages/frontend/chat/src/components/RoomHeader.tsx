import type { Room } from '../schemas/room';

interface RoomHeaderProps {
  room: Room;
  onOpenSettings?: () => void;
}

export function RoomHeader({ room, onOpenSettings }: RoomHeaderProps) {
  return (
    <header>
      <h2>{room.name}</h2>
      {room.topic ? <p>{room.topic}</p> : null}
      {room.my_role === 'owner' || room.my_role === 'admin' ? (
        <button type="button" onClick={onOpenSettings}>
          Настройки комнаты
        </button>
      ) : null}
    </header>
  );
}
