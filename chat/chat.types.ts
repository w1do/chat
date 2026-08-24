/* ============================================================================
   СЕМЕЙНЫЙ ЧАТ — типы данных
   Прототип мобильного приложения (React Native / React).

   Карта файла:
     1. Идентификаторы и утилиты
     2. Пользователи и роли
     3. Права доступа
     4. Комнаты
     5. Сообщения
     6. Магическая кнопка (ИИ-помощник)
     7. Состояние приложения и действия
     8. События реального времени (Soketi / Laravel Echo)
     9. HTTP API: запросы и ответы
    10. Type guards
   ========================================================================== */

/* ── 1. Идентификаторы и утилиты ─────────────────────────────────────────── */

export type UserId = string;
export type RoomId = string;
export type MessageId = string;
export type FamilyId = string;

/** Метка времени в миллисекундах (Date.now()). */
export type Timestamp = number;

/** ISO-8601 строка, как её отдаёт бэкенд: "2026-08-23T09:14:00+08:00". */
export type IsoDateTime = string;

/** Курсор постраничной подгрузки истории. */
export type Cursor = string | null;

/* ── 2. Пользователи и роли ──────────────────────────────────────────────── */

/**
 * Роль в семье. Определяет базовый набор прав.
 * owner  — создал семью, управляет всем
 * parent — взрослый: свои комнаты, модерация
 * teen   — подросток
 * child  — ребёнок
 * guest  — родственник/няня: только те комнаты, куда позвали
 */
export type FamilyRole = 'owner' | 'parent' | 'teen' | 'child' | 'guest';

export type PresenceStatus = 'online' | 'offline' | 'typing';

export interface FamilyMember {
  id: UserId;
  familyId: FamilyId;
  name: string;
  role: FamilyRole;
  /** Эмодзи-аватар или URL картинки. */
  avatar: string;
  /** Цвет подписи и рамки аватара. */
  color: string;
  presence: PresenceStatus;
  lastSeenAt: Timestamp | null;
  /** Индивидуальные права поверх роли (например, ребёнку включили ИИ). */
  extraPermissions?: Permission[];
  /** Индивидуальные запреты поверх роли. */
  revokedPermissions?: Permission[];
}

/* ── 3. Права доступа ────────────────────────────────────────────────────── */

export type Permission =
  | 'room.view'            // видеть комнату в списке
  | 'room.write'           // писать сообщения
  | 'room.create'          // создавать комнаты
  | 'room.manage'          // переименовать, менять доступ, удалить
  | 'room.invite'          // приглашать участников
  | 'message.delete.own'   // удалять свои сообщения
  | 'message.delete.any'   // удалять чужие сообщения
  | 'message.pin'          // закреплять
  | 'ai.enhance';          // магическая кнопка

/** Матрица «роль → права». Реализация в permissions.ts. */
export type PermissionMatrix = Record<FamilyRole, readonly Permission[]>;

/** Почему комната закрыта — текст для интерфейса. */
export interface AccessDenial {
  roomId: RoomId;
  reason: 'role' | 'not-invited' | 'age-limit';
  message: string;
}

/* ── 4. Комнаты ──────────────────────────────────────────────────────────── */

export type RoomKind =
  | 'general'   // общая комната, вход по умолчанию
  | 'topic'     // тематическая: покупки, поездки
  | 'private'   // закрытая: родители, бюджет
  | 'board'     // объявления: читают все, пишут родители
  | 'direct';   // личная переписка двоих

export interface Room {
  id: RoomId;
  familyId: FamilyId;
  kind: RoomKind;
  title: string;
  /** Эмодзи-обложка комнаты. */
  emoji: string;
  description: string;
  /** Кто видит комнату. */
  readRoles: readonly FamilyRole[];
  /** Кто может писать. */
  writeRoles: readonly FamilyRole[];
  /** Поимённый список — сильнее ролей, если задан (для direct и приглашений). */
  memberIds?: readonly UserId[];
  /** Общая комната: в неё попадают сразу после входа, выйти нельзя. */
  isDefault: boolean;
  pinned: boolean;
  createdBy: UserId;
  createdAt: Timestamp;
  lastMessage: MessagePreview | null;
  unreadCount: number;
}

export interface MessagePreview {
  authorName: string;
  text: string;
  sentAt: Timestamp;
}

/* ── 5. Сообщения ────────────────────────────────────────────────────────── */

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageBase {
  id: MessageId;
  roomId: RoomId;
  authorId: UserId;
  sentAt: Timestamp;
  editedAt: Timestamp | null;
  status: MessageStatus;
  replyToId: MessageId | null;
  reactions: Reaction[];
  /** true, если текст прошёл через магическую кнопку. */
  enhanced: boolean;
}

export interface TextMessage extends MessageBase {
  kind: 'text';
  text: string;
}

export interface ImageMessage extends MessageBase {
  kind: 'image';
  attachment: ImageAttachment;
  caption: string;
}

export interface VoiceMessage extends MessageBase {
  kind: 'voice';
  attachment: VoiceAttachment;
}

export interface FileMessage extends MessageBase {
  kind: 'file';
  attachment: FileAttachment;
}

/** Служебное: «Папа создал комнату», «Соня вошла». */
export interface SystemMessage extends MessageBase {
  kind: 'system';
  event: 'room.created' | 'member.joined' | 'member.left' | 'room.renamed';
  text: string;
}

export type Message =
  | TextMessage
  | ImageMessage
  | VoiceMessage
  | FileMessage
  | SystemMessage;

export interface AttachmentBase {
  id: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface ImageAttachment extends AttachmentBase {
  type: 'image';
  width: number;
  height: number;
  thumbnailUrl: string;
}

export interface VoiceAttachment extends AttachmentBase {
  type: 'voice';
  durationSec: number;
  /** Огибающая для рисования дорожки, значения 0..1. */
  waveform: number[];
}

export interface FileAttachment extends AttachmentBase {
  type: 'file';
  fileName: string;
}

export type Attachment = ImageAttachment | VoiceAttachment | FileAttachment;

export interface Reaction {
  emoji: string;
  userIds: UserId[];
}

/* ── 6. Магическая кнопка (ИИ-помощник) ──────────────────────────────────── */

/** Что делаем с черновиком. */
export type MagicAction =
  | 'improve'   // яснее и приятнее
  | 'shorten'   // короче
  | 'expand'    // подробнее
  | 'soften'    // мягче, без резкости
  | 'grammar'   // исправить ошибки
  | 'emoji';    // добавить эмодзи

export interface MagicActionMeta {
  id: MagicAction;
  label: string;
  /** Подпись под кнопкой в меню. */
  hint: string;
  /** Инструкция, которая уходит в модель. */
  instruction: string;
}

export interface MagicRequest {
  action: MagicAction;
  text: string;
  /** Контекст улучшает результат: тон для «Детской» и «Бюджета» разный. */
  roomId: RoomId;
  authorRole: FamilyRole;
  /** Последние сообщения комнаты — чтобы попасть в тон беседы. */
  recentMessages?: string[];
}

export interface MagicResult {
  action: MagicAction;
  original: string;
  suggestion: string;
  /** 'api' — ответ модели, 'fallback' — локальная заглушка при недоступном ИИ. */
  source: 'api' | 'fallback';
  requestedAt: Timestamp;
}

export type MagicPhase = 'closed' | 'menu' | 'loading' | 'preview' | 'error';

export interface MagicState {
  phase: MagicPhase;
  action: MagicAction | null;
  result: MagicResult | null;
  /** Текст ошибки для интерфейса. */
  error: string | null;
  /** Исходник для кнопки «Вернуть» после замены. */
  undoText: string | null;
}

/* ── 7. Состояние приложения и действия ──────────────────────────────────── */

export type Screen = 'rooms' | 'chat';

export interface ChatState {
  familyId: FamilyId;
  currentUserId: UserId;
  members: Record<UserId, FamilyMember>;
  rooms: Record<RoomId, Room>;
  roomOrder: RoomId[];
  messagesByRoom: Record<RoomId, Message[]>;
  screen: Screen;
  activeRoomId: RoomId;
  draftByRoom: Record<RoomId, string>;
  magic: MagicState;
  toast: string | null;
}

export type ChatAction =
  | { type: 'room/open'; roomId: RoomId }
  | { type: 'room/close' }
  | { type: 'room/denied'; denial: AccessDenial }
  | { type: 'draft/change'; roomId: RoomId; text: string }
  | { type: 'message/send'; roomId: RoomId; text: string; enhanced: boolean }
  | { type: 'message/status'; messageId: MessageId; status: MessageStatus }
  | { type: 'message/received'; message: Message }
  | { type: 'magic/open' }
  | { type: 'magic/run'; action: MagicAction }
  | { type: 'magic/done'; result: MagicResult }
  | { type: 'magic/failed'; error: string }
  | { type: 'magic/apply' }
  | { type: 'magic/undo' }
  | { type: 'magic/close' }
  | { type: 'user/switch'; userId: UserId }   // только для демо
  | { type: 'toast/show'; text: string }
  | { type: 'toast/hide' };

/* ── 8. События реального времени (Soketi / Laravel Echo) ────────────────── */

/** Приватный канал комнаты: private-family.{familyId}.room.{roomId} */
export type RoomChannel = `private-family.${FamilyId}.room.${RoomId}`;
/** Канал присутствия семьи: presence-family.{familyId} */
export type FamilyChannel = `presence-family.${FamilyId}`;

export type RealtimeEvent =
  | { event: 'message.created'; payload: Message }
  | { event: 'message.updated'; payload: Message }
  | { event: 'message.deleted'; payload: { messageId: MessageId; roomId: RoomId } }
  | { event: 'message.read'; payload: { roomId: RoomId; userId: UserId; upToId: MessageId } }
  | { event: 'member.typing'; payload: { roomId: RoomId; userId: UserId } }
  | { event: 'member.presence'; payload: { userId: UserId; status: PresenceStatus } }
  | { event: 'room.access.changed'; payload: { roomId: RoomId; readRoles: FamilyRole[]; writeRoles: FamilyRole[] } };

/* ── 9. HTTP API: запросы и ответы ───────────────────────────────────────── */

export interface Paginated<T> {
  items: T[];
  nextCursor: Cursor;
  hasMore: boolean;
}

export interface ApiError {
  code: 'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'rate_limited' | 'server';
  message: string;
  fields?: Record<string, string[]>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/** GET /api/rooms */
export type GetRoomsResponse = ApiResult<{ rooms: Room[]; defaultRoomId: RoomId }>;

/** GET /api/rooms/{roomId}/messages?cursor=&limit= */
export interface GetMessagesRequest {
  roomId: RoomId;
  cursor?: Cursor;
  limit?: number;
}
export type GetMessagesResponse = ApiResult<Paginated<Message>>;

/** POST /api/rooms/{roomId}/messages */
export interface SendMessageRequest {
  roomId: RoomId;
  /** Генерируется на клиенте — защита от дублей при переотправке. */
  clientId: string;
  kind: 'text' | 'image' | 'voice' | 'file';
  text?: string;
  attachmentId?: string;
  replyToId?: MessageId | null;
  enhanced: boolean;
}
export type SendMessageResponse = ApiResult<Message>;

/** POST /api/ai/enhance */
export type EnhanceResponse = ApiResult<{ suggestion: string; action: MagicAction }>;

/** PATCH /api/rooms/{roomId}/access */
export interface UpdateRoomAccessRequest {
  roomId: RoomId;
  readRoles: FamilyRole[];
  writeRoles: FamilyRole[];
  memberIds?: UserId[];
}

/* ── 10. Type guards ─────────────────────────────────────────────────────── */

export const isTextMessage = (m: Message): m is TextMessage => m.kind === 'text';
export const isSystemMessage = (m: Message): m is SystemMessage => m.kind === 'system';
export const isOwnMessage = (m: Message, userId: UserId): boolean => m.authorId === userId;
export const isApiOk = <T,>(r: ApiResult<T>): r is { ok: true; data: T } => r.ok;
