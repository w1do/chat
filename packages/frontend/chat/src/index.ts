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
export { useRealtimeRoom, type JoinGreeting } from './hooks/useRealtimeRoom';
export { EmojiPicker, EMOJI_GROUPS } from './components/mobile/EmojiPicker';
export { SystemEntry, systemText } from './components/mobile/SystemEntry';
export { splitTimeline, type TimelineEntry } from './format';
export { useTyping } from './hooks/useTyping';
export {
  useIncomingMessages,
  useNotificationPermission,
  type IncomingMessage,
} from './hooks/useIncomingMessages';
export { ChatScreen } from './components/mobile/ChatScreen';
export { MagicSheet, MAGIC_ACTIONS, type MagicAction, type MagicPhase } from './components/mobile/MagicSheet';
export { RoomsScreen } from './components/mobile/RoomsScreen';
export { buildGroups, dayLabel, formatTime, ROLE_LABEL } from './format';
export { useDeleteMessage, useEditMessage, useMessages, useReactions, useSendMessage } from './hooks/useMessages';
export { useCreateRoom, useMembers, useMembershipActions, useRoom, useRooms } from './hooks/useRooms';
export { MentionPicker } from './components/MentionPicker';
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
