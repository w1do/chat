import {
  Dots,
  MIN_INPUT_FONT,
  RADIUS,
  SPRING,
  TEXT_SIZE_PX,
  overlayOnOwn,
  roomEmoji,
  useElementHeight,
  voiceHue,
  type TextSize,
  type ThemeTokens,
} from '@vendor/ui';
import { Check, CheckCheck, ChevronLeft, Lock, RotateCcw, Search, Send, Smile, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dayLabel, formatTime, ROLE_LABEL, splitTimeline } from '../../format';
import type { ConnectionState } from '../../adapters/RealtimeAdapter';
import type { Message, SendMessageInput } from '../../schemas/message';
import { MentionPicker } from '../MentionPicker';
import { EmojiPicker } from './EmojiPicker';
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
  /** Черновик под управлением приложения: помощник его заменяет. */
  draft: string;
  onDraftChange: (text: string) => void;
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
  draft,
  onDraftChange,
}: ChatScreenProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const headerHeight = useElementHeight(headerRef);
  const composerHeight = useElementHeight(composerRef);
  const [sendError, setSendError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

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
  }, [ordered.length, typingUserIds.length]);

  useEffect(() => {
    scrollToBottom(false);
  }, [keyboard, room.id, composerHeight]);

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

  const mentionMatch = /@([\p{L}\w-]*)$/u.exec(draft);

  let lastDay: string | null = null;

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      <div
        ref={scroller}
        className="absolute inset-0 overflow-y-auto scroll-area px-3"
        style={{ paddingTop: headerHeight + 8, paddingBottom: composerHeight + 10 }}
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

              <div className={`flex mb-2.5 ${own ? 'justify-end' : 'justify-start'}`}>
                {!own ? (
                  <span aria-hidden="true" className="shrink-0 mr-2" style={{ width: 2.5, borderRadius: 2, background: hue }} />
                ) : null}

                <div className="flex flex-col gap-0.5" style={{ maxWidth: '80%' }}>
                  {!own ? (
                    <span className="text-[13px] font-semibold px-1 mb-0.5" style={{ color: hue }}>
                      {author}
                    </span>
                  ) : null}

                  {group.items.map((message, index) => {
                    const isLast = index === group.items.length - 1;
                    const reply: Message | null = message.reply_to_id ? (byId.get(message.reply_to_id) ?? null) : null;
                    const reactionCount = message.reactions.reduce((sum, reaction) => sum + reaction.count, 0);

                    return (
                      <article
                        key={message.id}
                        data-message-id={message.id}
                        aria-label={`Сообщение ${message.id}`}
                        onDoubleClick={() => !message.deleted && onToggleReaction(message.id, '❤️')}
                        className={`relative px-3.5 py-2 ${own ? 'enter-right' : 'enter-left'}`}
                        style={{
                          background: own ? theme.own : theme.surface,
                          color: own ? theme.ownText : theme.text,
                          borderRadius: RADIUS.bubble,
                          borderTopLeftRadius: !own && index === 0 ? 8 : RADIUS.bubble,
                          borderTopRightRadius: own && index === 0 ? 8 : RADIUS.bubble,
                          alignSelf: own ? 'flex-end' : 'flex-start',
                          marginBottom: reactionCount > 0 ? 12 : 0,
                          opacity: message.deleted ? 0.6 : 1,
                          boxShadow:
                            highlightedId === message.id ? `0 0 0 2px ${theme.amber}` : 'none',
                          transition: 'box-shadow .4s ease',
                        }}
                      >
                        {message.reply_to_id ? (
                          <button
                            type="button"
                            onClick={() => jumpToMessage(message.reply_to_id!)}
                            aria-label={`Перейти к сообщению ${message.reply_to_id}`}
                            className="w-full text-left text-[12.5px] mb-1 px-2 py-1 tap flex gap-2"
                            style={{
                              background: own ? overlayOnOwn(theme) : theme.surfaceAlt,
                              borderRadius: 8,
                              color: own ? theme.ownText : theme.muted,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="shrink-0"
                              style={{
                                width: 2,
                                borderRadius: 2,
                                background: reply ? voiceHue(reply.author_id) : theme.faint,
                              }}
                            />
                            <span className="min-w-0">
                              <span className="block font-semibold truncate">
                                {reply ? (namesById.get(reply.author_id) ?? reply.author_name ?? '') : 'Сообщение'}
                              </span>
                              <span className="block truncate">
                                {reply === null
                                  ? 'Сообщение не загружено'
                                  : reply.deleted
                                    ? 'Сообщение удалено'
                                    : reply.body}
                              </span>
                            </span>
                          </button>
                        ) : null}

                        <p
                          style={{
                            fontSize,
                            lineHeight: 1.35,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontStyle: message.deleted ? 'italic' : 'normal',
                          }}
                        >
                          {message.deleted ? 'Сообщение удалено' : message.body}
                        </p>

                        {isLast && !message.deleted ? (
                          <span
                            className="flex items-center gap-1 justify-end mt-0.5 text-[11px] tnum"
                            style={{ color: own ? `${theme.ownText}99` : theme.faint }}
                          >
                            {message.edited_at ? <em>изменено</em> : null}
                            {formatTime(message.created_at)}
                            {own ? (
                              message.id.startsWith('optimistic-') ? (
                                <Check size={13} aria-label="отправляется" />
                              ) : (
                                <CheckCheck size={13} aria-label="отправлено" />
                              )
                            ) : null}
                          </span>
                        ) : null}

                        {reactionCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => onToggleReaction(message.id, message.reactions[0]!.emoji)}
                            aria-label={`Реакции: ${reactionCount}`}
                            className="absolute pop grid place-items-center tap"
                            style={{
                              bottom: -11,
                              [own ? 'left' : 'right']: 10,
                              padding: '1px 6px',
                              background: theme.surface,
                              borderRadius: 11,
                              fontSize: 12,
                              color: theme.text,
                              boxShadow: '0 2px 8px rgba(20,19,26,.16)',
                            }}
                          >
                            {message.reactions.map((reaction) => reaction.emoji).join(' ')} {reactionCount}
                          </button>
                        ) : null}

                        {!message.deleted ? (
                          <span
                            className="absolute flex flex-col gap-1"
                            style={{ top: 2, [own ? 'right' : 'left']: -22 }}
                          >
                            <button
                              type="button"
                              onClick={() => setReplyTo(message)}
                              aria-label={`Ответить на сообщение ${message.id}`}
                              className="tap"
                              style={{ color: theme.faint, fontSize: 12 }}
                            >
                              ↩
                            </button>
                            <button
                              type="button"
                              onClick={() => setReactionFor((current) => (current === message.id ? null : message.id))}
                              aria-label={`Выбрать реакцию для сообщения ${message.id}`}
                              aria-expanded={reactionFor === message.id}
                              className="tap"
                              style={{ color: theme.faint, fontSize: 12 }}
                            >
                              ☺
                            </button>
                            {own ? (
                              <button
                                type="button"
                                onClick={() => onDeleteMessage(message.id)}
                                aria-label={`Удалить сообщение ${message.id}`}
                                className="tap"
                                style={{ color: theme.faint, fontSize: 12 }}
                              >
                                ✕
                              </button>
                            ) : null}
                          </span>
                        ) : null}

                        {reactionFor === message.id ? (
                          <span
                            className="absolute z-20"
                            style={{ top: '100%', [own ? 'right' : 'left']: 0, width: 232 }}
                          >
                            <EmojiPicker
                              theme={theme}
                              label={`Реакции для сообщения ${message.id}`}
                              onPick={(emoji) => {
                                onToggleReaction(message.id, emoji);
                                setReactionFor(null);
                              }}
                            />
                          </span>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {showTyping && typingNames.length > 0 ? (
          <div className="flex mb-2.5 enter-left" role="status" aria-live="polite">
            <span aria-hidden="true" className="shrink-0 mr-2" style={{ width: 2.5, borderRadius: 2, background: theme.muted }} />
            <div>
              <span className="text-[13px] font-semibold px-1" style={{ color: theme.muted }}>
                {typingNames.length === 1 ? `${typingNames[0]} печатает` : `${typingNames.slice(0, 2).join(', ')} печатают`}
              </span>
              <div
                className="px-4 py-3 mt-0.5"
                style={{ background: theme.surface, borderRadius: RADIUS.bubble, borderTopLeftRadius: 8 }}
              >
                <Dots color={theme.faint} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <header
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2.5 px-2 pb-2.5 safe-top blur-chrome"
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
          ) : (
            <p className="text-[12.5px] truncate" style={{ color: theme.muted }}>
              {room.topic ??
                `${room.member_count ?? 0} участников${room.my_role ? ` · вы ${ROLE_LABEL[room.my_role]}` : ''}`}
            </p>
          )}
        </button>
      </header>

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

      <div
        ref={composerRef}
        className={`absolute bottom-0 left-0 right-0 z-10 px-3 pt-2 blur-chrome ${keyboard > 0 ? 'pb-2' : 'safe-bottom'}`}
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
            className="flex items-end gap-1.5 p-1.5"
            style={{
              background: theme.surface,
              borderRadius: 24,
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
