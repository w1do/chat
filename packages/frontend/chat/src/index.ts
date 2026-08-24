// Публичный entrypoint пакета @vendor/chat.
export { roomsApi } from './api';
export { ChatProvider, useChatClient } from './adapters/ChatProvider';
export { CreateRoomForm } from './components/CreateRoomForm';
export { MembershipManager } from './components/MembershipManager';
export { RoomHeader } from './components/RoomHeader';
export { RoomList } from './components/RoomList';
export { useCreateRoom, useMembers, useMembershipActions, useRoom, useRooms } from './hooks/useRooms';
export {
  createRoomSchema,
  memberSchema,
  roomSchema,
  type CreateRoomInput,
  type Member,
  type Room,
} from './schemas/room';
