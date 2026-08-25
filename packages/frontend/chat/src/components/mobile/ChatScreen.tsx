import {
  Avatar,
  Dots,
  MIN_INPUT_FONT,
  RADIUS,
  Screen,
  SPRING,
  TEXT_SIZE_PX,
  overlayOnOwn,
  roomEmoji,
  voiceHue,
  type TextSize,
  type ThemeTokens,
} from '@vendor/ui';
import { Check, CheckCheck, ChevronLeft, Lock, RotateCcw, Search, Send, Smile, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  dayLabel,
  formatTime,
  readGestureHintSeen,
  rememberGestureHint,
  ROLE_LABEL,
  splitTimeline,
  typingSummary,
} from '../../format';
import type { ConnectionState } from '../../adapters/RealtimeAdapter';
import type { Message, SendMessageInput } from '../../schemas/message';
import { MentionPicker } from '../MentionPicker';
import { useMessageGestures } from '../../hooks/useMessageGestures';
import { EmojiPicker } from './EmojiPicker';
import { MessageActionsSheet } from './MessageActionsSheet';
import { MessageBubble, QUICK_REACTION } from './MessageBubble';
import { SearchSheet } from './SearchSheet';
import { SystemEntry } from './SystemEntry';
import type { Member, Room } from '../../schemas/room';

interface ChatScreenProps {
  room: Room;
  messages: Message[];
  members: Member[];
  currentUserId: string;
  theme: ThemeTokens;
  textSize: TextSize;
  sendOnEnter: boolean;
  showTyping: boolean;
  typingUserIds: string[];
  /** Состояние WebSocket-соединения: обрыв виден пользователю. */
  connection: ConnectionState;
  /** Высота экранной клавиатуры — панель ввода поднимается над ней. */
  keyboard: number;
  isLoading: boolean;
  error?: unknown;
  hasMore: boolean;
  aiEnabled: boolean;
  undoText: string | null;
  magicBusy: boolean;
  onBack: () => void;
  onLoadMore: () => void;
  onSend: (input: SendMessageInput) => Promise<unknown>;
  onTyping: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMagic: (draft: string) => void;
  onUndoMagic: () => void;
  onJoin?: () => Promise<unknown>;
  onOpenMembers?: () => void;
  /** Приглашение: экран отдаёт наружу готовый текст со ссылкой. */
  onInvite?: () => void;
  /** Черновик под управлением приложения: помощник его заменяет. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Короткое сообщение пользователю (копирование текста, подсказки). */
  onToast?: (text: string) => void;
}

/** Экран переписки: лента с группировкой по автору, панель ввода, помощник. */
export function ChatScreen({
  room,
  messages,
  members,
  currentUserId,
  theme,
  textSize,
  sendOnEnter,
  showTyping,
  typingUserIds,
  connection,
  keyboard,
  isLoading,
  error,
  hasMore,
  aiEnabled,
  undoText,
  magicBusy,
  onBack,
  onLoadMore,
  onSend,
  onTyping,
  onToggleReaction,
  onDeleteMessage,
  onMagic,
  onUndoMagic,
  onJoin,
  onOpenMembers,
  onInvite,
  draft,
  onDraftChange,
  onToast,
}: ChatScreenProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<Message | null>(null);
  // Смещение пузыря во время свайпа: id сообщения → сдвиг в пикселях.
  const [swipe, setSwipe] = useState<{ id: string; offset: number } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Действия спрятаны в жесты — один раз объясняем, где они.
  const [hintSeen, setHintSeen] = useState(() => readGestureHintSeen());

  /** Ответ начинается жестом или из меню: цитата над полем и фокус в нём. */
  const startReply = (message: Message) => {
    setReplyTo(message);
    textarea.current?.focus();
  };

  /** Переход от цитаты к оригиналу: подсветка гаснет сама. */
  const jumpToMessage = (messageId: string) => {
    const target = scroller.current?.querySelector(`[data-message-id="${messageId}"]`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), 1600);
  };

  const isMember = room.my_role !== null;
  const canWrite = isMember && room.archived_at === null;
  const fontSize = TEXT_SIZE_PX[textSize];
  const namesById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member.name ?? member.user_id])),
    [members],
  );

  // API отдаёт новые → старые; лента показывает старые сверху.
  const ordered = useMemo(() => [...messages].reverse(), [messages]);
  // Системные записи стоят отдельными строками и не группируются с репликами.
  const timeline = useMemo(() => splitTimeline(ordered), [ordered]);
  const byId = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  const scrollToBottom = (smooth: boolean) => {
    const element = scroller.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [ordered.length]);

  useEffect(() => {
    scrollToBottom(false);
  }, [keyboard, room.id]);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;

    setSendError(null);
    try {
      await onSend({
        body: text,
        reply_to_id: replyTo?.id ?? null,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      onDraftChange('');
      setReplyTo(null);
      setMentions([]);
    } catch {
      // Текст остаётся в поле — можно отправить повторно.
      setSendError('Не удалось отправить. Попробуйте ещё раз.');
    }
  };

  const typingNames = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => namesById.get(id) ?? 'Кто-то');
  // «Печатает» живёт в шапке: в ленте оно дёргало прокрутку.
  const typingLine = showTyping ? typingSummary(typingNames) : null;

  const mentionMatch = /@([\p{L}\w-]*)$/u.exec(draft);

  /** Имя автора цитируемого сообщения — участник может быть уже не в комнате. */
  const replyAuthorName = (message: Message): string => {
    const original = message.reply_to_id ? byId.get(message.reply_to_id) : undefined;

    if (original === undefined) return '';

    return namesById.get(original.author_id) ?? original.author_name ?? '';
  };

  let lastDay: string | null = null;

  /** Шапка и панель ввода — закреплённые края Screen, а не absolute-слои. */
  const renderHeader = () => (
    <header
      ref={headerRef}
        className="flex items-center gap-2.5 px-2 pb-2.5 safe-top blur-chrome"
        style={{ background: theme.chromeAlpha }}
      >
        <button
          type="button"
          onClick={onBack}
          className="tap grid place-items-center"
          style={{ width: 34, height: 34, color: theme.text }}
          aria-label="Назад"
        >
          <ChevronLeft size={26} />
        </button>
        <span
          aria-hidden="true"
          className="grid place-items-center shrink-0"
          style={{ width: 36, height: 36, borderRadius: 13, background: theme.surfaceAlt, fontSize: 18 }}
        >
          {roomEmoji(room.name)}
        </span>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="tap grid place-items-center order-last shrink-0"
          style={{ width: 34, height: 34, color: theme.text }}
          aria-label="Поиск по комнате"
        >
          <Search size={19} />
        </button>
        {onInvite ? (
          <button
            type="button"
            onClick={onInvite}
            className="flex items-center gap-1 tap order-last shrink-0 px-2"
            style={{ height: 30, borderRadius: 15, background: theme.surfaceAlt, color: theme.text, fontSize: 13 }}
          >
            <UserPlus size={15} /> Пригласить
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenMembers}
          disabled={!onOpenMembers}
          aria-label="Участники комнаты"
          className="min-w-0 flex-1 text-left tap"
        >
          <h1 className="text-[16px] font-semibold truncate" style={{ color: theme.text, letterSpacing: '-0.01em' }}>
            {room.name}
          </h1>
          {/* Одна строка на все состояния: подмена не двигает ленту. */}
          {connection !== 'connected' ? (
            <p
              role="alert"
              aria-live="assertive"
              aria-label="Состояние соединения"
              className="text-[12.5px] truncate"
              style={{ color: theme.amberText }}
            >
              {connection === 'disconnected'
                ? 'Соединение потеряно.'
                : 'Переподключение… история будет синхронизирована.'}
            </p>
          ) : typingLine !== null ? (
            <p
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-[12.5px] truncate"
              style={{ color: theme.amberText }}
            >
              {typingLine} <Dots color={theme.amberText} size={3} />
            </p>
          ) : (
            <p className="text-[12.5px] truncate" style={{ color: theme.muted }}>
              {room.topic ??
                `${room.member_count ?? 0} участников${room.my_role ? ` · вы ${ROLE_LABEL[room.my_role]}` : ''}`}
            </p>
          )}
        </button>
      </header>
  );

  const renderComposer = () => (
      <div
        ref={composerRef}
        // Панель во всю ширину; при открытой клавиатуре стоит вплотную к ней,
        // при закрытой — отступает на нижнюю полосу видимой области.
        data-testid="composer"
        className={`w-full px-2 pt-2 blur-chrome ${keyboard > 0 ? 'pb-2' : 'safe-bottom'}`}
        style={{ background: theme.chromeAlpha }}
      >
        {sendError ? (
          <p role="alert" className="mb-2 ml-2 text-[13px]" style={{ color: theme.danger }}>
            {sendError}
          </p>
        ) : null}

        {undoText !== null ? (
          <button
            type="button"
            onClick={onUndoMagic}
            className="flex items-center gap-1.5 mb-2 ml-2 text-[13px] tap enter"
            style={{ color: theme.amberText }}
          >
            <RotateCcw size={13} /> Вернуть мой текст
          </button>
        ) : null}

        {replyTo && canWrite ? (
          <div
            role="status"
            aria-label="Ответ на сообщение"
            className="flex items-center gap-2 mb-2 px-3 py-1.5 text-[13px]"
            style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.muted }}
          >
            <span className="flex-1 min-w-0 truncate">
              Ответ {namesById.get(replyTo.author_id) ?? replyTo.author_name ?? ''}: {replyTo.body}
            </span>
            <button type="button" aria-label="Отменить ответ" onClick={() => setReplyTo(null)} className="tap">
              ✕
            </button>
          </div>
        ) : null}

        {emojiOpen && canWrite ? (
          <div className="mb-2">
            <EmojiPicker
              theme={theme}
              label="Эмодзи для сообщения"
              onPick={(emoji) => {
                // Вставка по позиции каретки, а не в конец строки.
                const field = textarea.current;
                const start = field?.selectionStart ?? draft.length;
                const end = field?.selectionEnd ?? draft.length;
                const next = draft.slice(0, start) + emoji + draft.slice(end);
                onDraftChange(next);
                setEmojiOpen(false);
                window.requestAnimationFrame(() => {
                  field?.focus();
                  field?.setSelectionRange(start + emoji.length, start + emoji.length);
                });
              }}
            />
          </div>
        ) : null}

        {mentionMatch && canWrite ? (
          <div className="mb-2 px-1">
            <MentionPicker
              members={members}
              filter={mentionMatch[1] ?? ''}
              onPick={(member) => {
                onDraftChange(draft.replace(/@[\p{L}\w-]*$/u, `@${member.name ?? member.user_id} `));
                setMentions((current) =>
                  current.includes(member.user_id) ? current : [...current, member.user_id],
                );
              }}
            />
          </div>
        ) : null}

        {!canWrite ? (
          <div
            className="flex flex-col items-center gap-2 py-3.5 px-3 text-[14px] text-center"
            style={{ background: theme.surface, color: theme.muted, borderRadius: RADIUS.md }}
          >
            <span className="flex items-center gap-2">
              <Lock size={14} />
              {room.archived_at !== null
                ? 'Комната в архиве — сюда больше не пишут'
                : 'Вы не участник комнаты'}
            </span>
            {!isMember && room.visibility === 'public' && room.archived_at === null && onJoin ? (
              <button
                type="button"
                disabled={joining}
                onClick={async () => {
                  setJoining(true);
                  try {
                    await onJoin();
                  } finally {
                    setJoining(false);
                  }
                }}
                className="px-4 py-2 tap text-[15px] font-medium"
                style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm }}
              >
                {joining ? 'Вступаем…' : 'Вступить в комнату'}
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="flex items-end gap-1.5 w-full p-1.5"
            style={{
              background: theme.surface,
              borderRadius: 22,
              boxShadow: magicBusy ? `0 0 0 2px ${theme.amber}` : '0 1px 3px rgba(20,19,26,.10)',
              transition: 'box-shadow .3s ease',
            }}
          >
            <label htmlFor="composer-body" className="sr-only">
              Сообщение
            </label>
            <textarea
              ref={textarea}
              id="composer-body"
              aria-label="Сообщение"
              value={draft}
              onChange={(event) => {
                onDraftChange(event.target.value);
                if (event.target.value.trim() !== '') onTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && sendOnEnter) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder="Сообщение"
              enterKeyHint={sendOnEnter ? 'send' : 'enter'}
              autoCapitalize="sentences"
              autoCorrect="on"
              className="flex-1 resize-none bg-transparent px-3 py-2 outline-none"
              style={{ color: theme.text, maxHeight: 116, fontSize: Math.max(MIN_INPUT_FONT, fontSize), lineHeight: 1.35 }}
            />

            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label="Эмодзи"
              aria-expanded={emojiOpen}
              className="tap grid place-items-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 18, background: theme.surfaceAlt, color: theme.muted }}
            >
              <Smile size={18} />
            </button>

            <button
              type="button"
              onClick={() => onMagic(draft)}
              className="tap grid place-items-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: aiEnabled ? theme.amberSoft : theme.surfaceAlt,
                color: aiEnabled ? theme.amberText : theme.faint,
              }}
              aria-label="Помощник с текстом"
            >
              {aiEnabled ? <Sparkles size={18} /> : <Lock size={15} />}
            </button>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!draft.trim()}
              className="grid place-items-center shrink-0 tap"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: theme.text,
                color: theme.bg,
                transform: draft.trim() ? 'scale(1)' : 'scale(.6)',
                opacity: draft.trim() ? 1 : 0,
                transition: `transform .26s ${SPRING}, opacity .2s ease`,
                marginRight: draft.trim() ? 0 : -42,
              }}
              aria-label="Отправить"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
  );

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      <Screen
        theme={theme}
        contentRef={scroller}
        contentClassName="px-3 pt-2"
        header={renderHeader()}
        footer={renderComposer()}
      >
        {isLoading ? (
          <p aria-busy="true" className="py-6 text-center text-[15px]" style={{ color: theme.muted }}>
            Загрузка сообщений…
          </p>
        ) : error ? (
          <p role="alert" className="py-6 text-center text-[15px]" style={{ color: theme.danger }}>
            Не удалось загрузить сообщения.
          </p>
        ) : ordered.length === 0 ? (
          <p role="status" className="py-6 text-center text-[15px]" style={{ color: theme.muted }}>
            Пока тихо. Напишите первым.
          </p>
        ) : null}

        {!hintSeen && ordered.length > 0 && canWrite ? (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={() => {
                setHintSeen(true);
                rememberGestureHint();
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-[12.5px] tap"
              style={{ background: theme.amberSoft, color: theme.amberText, borderRadius: 12 }}
            >
              Потяните сообщение влево — ответить, удерживайте — меню. Понятно
            </button>
          </div>
        ) : null}

        {hasMore ? (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={onLoadMore}
              className="px-3 py-1.5 text-[13px] tap"
              style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: 9 }}
            >
              Показать более ранние
            </button>
          </div>
        ) : null}

        {timeline.map((entry) => {
          if (entry.type === 'system') {
            const showSystemDay = dayKeyOf(entry.message.created_at) !== lastDay;
            lastDay = dayKeyOf(entry.message.created_at);

            return (
              <div key={entry.key}>
                {showSystemDay ? <DayDivider iso={entry.message.created_at} theme={theme} /> : null}
                <SystemEntry
                  message={entry.message}
                  actorName={namesById.get(entry.message.payload?.actor_id ?? '') ?? 'Участник'}
                  theme={theme}
                />
              </div>
            );
          }

          const group = entry.group;
          const author = namesById.get(group.authorId) ?? group.items[0]?.author_name ?? group.authorId;
          const hue = voiceHue(group.authorId);
          const own = group.authorId === currentUserId;
          const showDay = group.day !== lastDay;
          lastDay = group.day;

          return (
            <div key={group.key}>
              {showDay ? <DayDivider iso={group.items[0]!.created_at} theme={theme} /> : null}

              <div className={`flex items-end gap-2 mb-3 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar userId={group.authorId} name={author} size={30} theme={theme} />

                <div className="flex flex-col gap-0.5 min-w-0" style={{ maxWidth: 'calc(100% - 46px)' }}>
                  {/* Имя автора над первым пузырём — у обеих сторон, как на макете. */}
                  <span
                    className={`text-[12.5px] font-semibold px-1 ${own ? 'text-right' : 'text-left'}`}
                    style={{ color: own ? theme.muted : hue }}
                  >
                    {author}
                  </span>

                  {group.items.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      reply={message.reply_to_id ? (byId.get(message.reply_to_id) ?? null) : null}
                      replyAuthor={replyAuthorName(message)}
                      own={own}
                      first={index === 0}
                      last={index === group.items.length - 1}
                      theme={theme}
                      fontSize={fontSize}
                      highlighted={highlightedId === message.id}
                      onReply={startReply}
                      onQuickReaction={(target) => onToggleReaction(target.id, QUICK_REACTION)}
                      onOpenActions={setActionsFor}
                      onToggleReaction={onToggleReaction}
                      onJump={jumpToMessage}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

      </Screen>


      <MessageActionsSheet
        message={actionsFor}
        authorName={
          actionsFor === null
            ? ''
            : (namesById.get(actionsFor.author_id) ?? actionsFor.author_name ?? 'Участник')
        }
        own={actionsFor?.author_id === currentUserId}
        theme={theme}
        onClose={() => setActionsFor(null)}
        onReply={startReply}
        onReact={(message, emoji) => onToggleReaction(message.id, emoji)}
        onDelete={(message) => onDeleteMessage(message.id)}
        onCopied={(ok) => onToast?.(ok ? 'Текст скопирован' : 'Не удалось скопировать текст')}
      />

      {/* Монтируем только открытым: запрос поиска не живёт фоном. */}
      {searchOpen ? (
        <SearchSheet
        open
        roomId={room.id}
        roomName={room.name}
        theme={theme}
        onClose={() => setSearchOpen(false)}
        onSelect={(messageId) => {
          if (!messages.some((message) => message.id === messageId)) {
            return false;
          }

          jumpToMessage(messageId);

          return true;
        }}
        />
      ) : null}

    </div>
  );
}

function dayKeyOf(iso: string): string {
  return new Date(iso).toDateString();
}

function DayDivider({ iso, theme }: { iso: string; theme: ThemeTokens }) {
  return (
    <div className="flex justify-center py-3">
      <span
        className="text-[11.5px] font-medium uppercase px-3 py-1"
        style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: 9, letterSpacing: '0.07em' }}
      >
        {dayLabel(iso)}
      </span>
    </div>
  );
}
