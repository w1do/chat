// Публичный entrypoint пакета @vendor/chat.
export { messagesApi, roomsApi } from './api';
export { ChatProvider, useChatClient } from './adapters/ChatProvider';
export { EchoAdapter } from './adapters/EchoAdapter';
export type {
  ConnectionState,
  PresenceMember,
  RealtimeAdapter,
  RoomSubscription,
} from './adapters/RealtimeAdapter';
export { applyRoomEvent, resyncRoom } from './realtime/handlers';
export type { PresenceEvent, RoomEvent } from './realtime/eventMap';
export { ConnectionBanner } from './components/ConnectionBanner';
export { PresenceDots } from './components/PresenceDots';
export { TypingIndicator } from './components/TypingIndicator';
export { useRealtimeRoom } from './hooks/useRealtimeRoom';
export { useTyping } from './hooks/useTyping';
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
