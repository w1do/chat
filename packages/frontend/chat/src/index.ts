// Публичный entrypoint пакета @vendor/chat.
export { messagesApi, roomsApi } from './api';
export { ChatProvider, useChatClient } from './adapters/ChatProvider';
export { CreateRoomForm } from './components/CreateRoomForm';
export { MembershipManager } from './components/MembershipManager';
export { RoomHeader } from './components/RoomHeader';
export { RoomList } from './components/RoomList';
export { useDeleteMessage, useEditMessage, useMessages, useReactions, useSendMessage } from './hooks/useMessages';
export { useCreateRoom, useMembers, useMembershipActions, useRoom, useRooms } from './hooks/useRooms';
export { MentionPicker } from './components/MentionPicker';
export { MessageComposer } from './components/MessageComposer';
export { MessageItem } from './components/MessageItem';
export { MessageList } from './components/MessageList';
export { ReactionBar } from './components/ReactionBar';
export { ReplyPreview } from './components/ReplyPreview';
export {
  messagePageSchema,
  messageSchema,
  reactionSchema,
  sendMessageSchema,
  type Message,
  type MessagePage,
  type Reaction,
  type SendMessageInput,
} from './schemas/message';
export {
  createRoomSchema,
  memberSchema,
  roomSchema,
  type CreateRoomInput,
  type Member,
  type Room,
} from './schemas/room';
