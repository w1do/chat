import {
  Avatar,
  Dots,
  MIN_INPUT_FONT,
  RADIUS,
  Screen,
  SPRING,
  TEXT_SIZE_PX,
  overlayOnOwn,
  voiceHue,
  type TextSize,
  type ThemeTokens,
} from '@vendor/ui';
import { Check, CheckCheck, ChevronLeft, EyeOff, Lock, Paperclip, Pencil, RotateCcw, Search, Send, Smile, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import type { Attachment, Message, SendMessageInput } from '../../schemas/message';
import type { PendingAttachment } from '../../hooks/useAttachmentUploads';
import { filterMentionCandidates, MentionPicker } from '../MentionPicker';
import { PresenceBadge } from '../PresenceBadge';
import { AttachmentGallery } from './AttachmentGallery';
import { isImageAttachment } from './AttachmentTiles';
import { ComposerAttachments } from './ComposerAttachments';
import { RoomGlyph } from '../RoomGlyph';
import { useMessageGestures } from '../../hooks/useMessageGestures';
import { EmojiPicker } from './EmojiPicker';
import { MessageActionsSheet } from './MessageActionsSheet';
import { MessageBubble, QUICK_REACTION } from './MessageBubble';
import { SearchSheet } from './SearchSheet';
import { SystemEntry } from './SystemEntry';
import { roomLabel, type Member, type Room } from '../../schemas/room';

interface ChatScreenProps {
  room: Room;
  messages: Message[];
  members: Member[];
  currentUserId: string;
  theme: ThemeTokens;
  /** Личные обои читающего; их видит только он сам. */
  wallpaperUrl?: string | null;
  textSize: TextSize;
  sendOnEnter: boolean;
  showTyping: boolean;
  typingUserIds: string[];
  /** Состояние WebSocket-соединения: обрыв виден пользователю. */
  connection: ConnectionState;
  /** Кто сейчас в комнате по presence-каналу: свежее, чем метка из API. */
  presentUserIds?: string[];
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
  /** Сохранение правки своего сообщения; нет — пункт «Редактировать» не показывается. */
  onEditMessage?: (messageId: string, body: string) => Promise<unknown>;
  onTyping: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMagic: (draft: string) => void;
  onUndoMagic: () => void;
  onJoin?: () => Promise<unknown>;
  onOpenMembers?: () => void;
  /** Приглашение: экран отдаёт наружу готовый текст со ссылкой. */
  onInvite?: () => void;
  /** Скрытие диалога у себя; есть только у личной переписки. */
  onHide?: () => Promise<unknown>;
  /** Черновик под управлением приложения: помощник его заменяет. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Вложения панели ввода: состоянием владеет приложение (useAttachmentUploads). */
  attachments?: PendingAttachment[];
  onPickFiles?: (files: File[]) => void;
  onRemoveAttachment?: (localId: string) => void;
  onRetryAttachment?: (localId: string) => void;
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
  presentUserIds = [],
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
  onEditMessage,
  onTyping,
  onToggleReaction,
  onDeleteMessage,
  onMagic,
  onUndoMagic,
  onJoin,
  onOpenMembers,
  onInvite,
  onHide,
  draft,
  onDraftChange,
  attachments = [],
  onPickFiles,
  onRemoveAttachment,
  onRetryAttachment,
  onToast,
  wallpaperUrl,
}: ChatScreenProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  /** Правится сообщение: строка ввода занята его текстом, отправка — сохранением. */
  const [editing, setEditing] = useState<Message | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  /** Позиция каретки: упоминание ищется до неё, а не в конце строки. */
  const [caret, setCaret] = useState(0);
  /** Куда поставить каретку после подстановки текста в поле ввода. */
  const pendingCaret = useRef<number | null>(null);
  /** Кандидат под клавиатурой в списке упоминаний. */
  const [mentionIndex, setMentionIndex] = useState(0);
  /** Список закрыт Escape — до следующей правки текста он не всплывает. */
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hideConfirm, setHideConfirm] = useState(false);

  // Диалог подписан собеседником и не имеет комнатных действий (spec).
  const isDirect = room.kind === 'direct';
  // Присутствие: канал знает о собеседнике «прямо сейчас», API — с точностью
  // до окна записи; вместе они не мигают при переподписке.
  const counterpart = room.counterpart ?? null;
  const counterpartOnline =
    counterpart !== null && (presentUserIds.includes(counterpart.id) || counterpart.is_online);
  const onlineCount = presentUserIds.filter((id) => id !== currentUserId).length;
  const label = roomLabel(room);
  const [actionsFor, setActionsFor] = useState<Message | null>(null);
  // Смещение пузыря во время свайпа: id сообщения → сдвиг в пикселях.
  const [swipe, setSwipe] = useState<{ id: string; offset: number } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Действия спрятаны в жесты — один раз объясняем, где они.
  const [hintSeen, setHintSeen] = useState(() => readGestureHintSeen());
  const fileInput = useRef<HTMLInputElement>(null);
  // Открытая галерея: изображения одного сообщения и стартовая позиция.
  const [gallery, setGallery] = useState<{ images: Attachment[]; index: number } | null>(null);

  const readyAttachmentIds = attachments.flatMap((item) => (item.attachment ? [item.attachment.id] : []));
  const uploadsBusy = attachments.some((item) => item.status === 'uploading');
  // Отправлять есть что, когда есть текст или готовые файлы — и ничего не
  // грузится. У правки файлов нет: сохраняется только непустой текст.
  const canSend =
    editing !== null
      ? draft.trim() !== ''
      : (draft.trim() !== '' || readyAttachmentIds.length > 0) && !uploadsBusy;

  const openGallery = (message: Message, attachmentId: string) => {
    const images = message.attachments.filter(isImageAttachment);
    const index = images.findIndex((image) => image.id === attachmentId);

    if (index >= 0) setGallery({ images, index });
  };

  /** Ответ начинается жестом или из меню: цитата над полем и фокус в нём. */
  const startReply = (message: Message) => {
    setReplyTo(message);
    textarea.current?.focus();
  };

  /**
   * Правка идёт в той же строке ввода: текст подставляется, ответ и вложения
   * уступают место — правится ровно одно сообщение.
   */
  const startEdit = (message: Message) => {
    setEditing(message);
    setReplyTo(null);
    setSendError(null);
    onDraftChange(message.body ?? '');
    moveCaretTo((message.body ?? '').length);
  };

  /** Отмена правки: черновик очищается, сообщение остаётся прежним. */
  const cancelEdit = () => {
    setEditing(null);
    setSendError(null);
    onDraftChange('');
  };

  /**
   * Каретка после подстановки: позиция запоминается и применяется сразу
   * после отрисовки нового текста — иначе следующий символ уедет в конец.
   */
  const moveCaretTo = (position: number) => {
    pendingCaret.current = position;
    setCaret(position);
  };

  /** Переход от цитаты к оригиналу: подсветка гаснет сама. */
  const jumpToMessage = (messageId: string) => {
    const target = scroller.current?.querySelector(`[data-message-id="${messageId}"]`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), 1600);
  };

  useLayoutEffect(() => {
    const position = pendingCaret.current;
    if (position === null) return;

    pendingCaret.current = null;
    const field = textarea.current;
    field?.focus();
    field?.setSelectionRange(position, position);
  });

  const isMember = room.my_role !== null;
  const canWrite = isMember && room.archived_at === null;
  const fontSize = TEXT_SIZE_PX[textSize];
  const namesById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member.name ?? member.user_id])),
    [members],
  );
  // Аватарки берутся из состава комнаты: событие о новом сообщении их не
  // несёт, и незачем — участники и так загружены.
  const avatars = useMemo(
    () => new Map(members.map((member) => [member.user_id, member.avatar_url])),
    [members],
  );
  // Ники нужны ленте: по ним `@тег` в тексте узнаётся как упоминание человека.
  const usernames = useMemo(
    () =>
      new Map(
        members.flatMap((member) => (member.username === null ? [] : [[member.user_id, member.username] as const])),
      ),
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

  // Панель ввода растёт при наборе текста (textarea авто‑высота) и от вложений.
  // Чтобы лента не «подпрыгивала» на каждый символ, компенсируем изменение
  // высоты дельтой прокрутки, а к низу прижимаем только когда пользователь у края.
  useEffect(() => {
    const composer = composerRef.current;
    const element = scroller.current;
    if (!composer || !element || typeof ResizeObserver === 'undefined') return;

    let height = composer.getBoundingClientRect().height;
    let frame = 0;

    const observer = new ResizeObserver(() => {
      const next = composer.getBoundingClientRect().height;
      const delta = next - height;
      height = next;
      if (delta === 0) return;

      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
        // Малый порог «липкости к низу»: считаем положение до изменения высоты.
        if (gap - delta < 24) element.scrollTop = element.scrollHeight;
        else element.scrollTop += delta;
      });
    });

    observer.observe(composer);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const submit = async () => {
    const text = draft.trim();

    // Правка идёт своим путём: у неё нет ни вложений, ни ответа.
    if (editing !== null) {
      if (text === '' || !onEditMessage) return;

      setSendError(null);
      try {
        await onEditMessage(editing.id, text);
        setEditing(null);
        onDraftChange('');
      } catch {
        // Текст остаётся в поле — правку можно повторить.
        setSendError('Не удалось сохранить правку. Попробуйте ещё раз.');
      }

      return;
    }

    if (!canSend) return;

    setSendError(null);
    try {
      await onSend({
        body: text,
        reply_to_id: replyTo?.id ?? null,
        mentions: mentions.length > 0 ? mentions : undefined,
        attachments: readyAttachmentIds.length > 0 ? readyAttachmentIds : undefined,
      });
      onDraftChange('');
      setReplyTo(null);
      setMentions([]);
    } catch {
      // Текст и вложения остаются на месте — можно отправить повторно.
      setSendError('Не удалось отправить. Попробуйте ещё раз.');
    }
  };

  const typingNames = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => namesById.get(id) ?? 'Кто-то');
  // «Печатает» живёт в шапке: в ленте оно дёргало прокрутку.
  const typingLine = showTyping ? typingSummary(typingNames) : null;

  // Упоминание набирается до каретки: `@` в середине строки тоже работает.
  const caretAt = Math.min(caret, draft.length);
  const mentionMatch = /@([\p{L}\w-]*)$/u.exec(draft.slice(0, caretAt));
  const mentionFilter = mentionMatch?.[1] ?? '';
  const mentionMatches = useMemo(
    () => (mentionMatch === null ? [] : filterMentionCandidates(members, mentionFilter)),
    [members, mentionMatch === null, mentionFilter],
  );
  // Список открыт, пока есть что показать и его не закрыли Escape.
  const mentionOpen = mentionMatch !== null && !mentionDismissed && mentionMatches.length > 0 && canWrite;
  const activeMention = mentionMatches[Math.min(mentionIndex, mentionMatches.length - 1)];

  /**
   * Вставка ника на место набранного `@…`: окружающий текст сохраняется, а
   * каретка встаёт сразу после вставленного упоминания.
   */
  const insertMention = (member: Member) => {
    if (mentionMatch === null) return;

    const start = caretAt - mentionMatch[0].length;
    const insertion = `@${member.username ?? member.name ?? member.user_id} `;
    const next = draft.slice(0, start) + insertion + draft.slice(caretAt);
    const position = start + insertion.length;

    onDraftChange(next);
    setMentions((current) => (current.includes(member.user_id) ? current : [...current, member.user_id]));
    setMentionIndex(0);
    moveCaretTo(position);
  };

  /** Имя автора цитируемого сообщения — участник может быть уже не в комнате. */
  const replyAuthorName = (message: Message): string => {
    const original = message.reply_to_id ? byId.get(message.reply_to_id) : undefined;

    if (original === undefined) return '';

    return namesById.get(original.author_id) ?? original.author_name ?? '';
  };

  // Подпись комнаты одной строкой: тема или состав, плюс кто сейчас на связи.
  const roomSubtitle =
    (room.topic ?? `${room.member_count ?? 0} участников${room.my_role ? ` · вы ${ROLE_LABEL[room.my_role]}` : ''}`) +
    (onlineCount > 0 ? ` · ${onlineCount} в сети` : '');

  let lastDay: string | null = null;

  /** Шапка и панель ввода — закреплённые края Screen, а не absolute-слои. */
  const renderHeader = () => (
    <header
      ref={headerRef}
        className="px-2 pb-2.5 safe-top blur-chrome"
        style={{ background: theme.chromeAlpha }}
      >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="tap grid place-items-center"
          style={{ width: 34, height: 34, color: theme.text }}
          aria-label="Назад"
        >
          <ChevronLeft size={26} />
        </button>
        <RoomGlyph name={label} photoUrl={room.photo_url} size={36} radius={13} theme={theme} />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="tap grid place-items-center order-last shrink-0"
          style={{ width: 34, height: 34, color: theme.text }}
          aria-label="Поиск по переписке"
        >
          <Search size={19} />
        </button>
        {/* Комнатные действия в диалоге не показываются: приглашать некого. */}
        {onInvite && !isDirect ? (
          <button
            type="button"
            onClick={onInvite}
            className="flex items-center gap-1 tap order-last shrink-0 px-2"
            style={{ height: 30, borderRadius: 15, background: theme.surfaceAlt, color: theme.text, fontSize: 13 }}
          >
            <UserPlus size={15} /> Пригласить
          </button>
        ) : null}
        {onHide && isDirect ? (
          <button
            type="button"
            onClick={() => setHideConfirm(true)}
            className="tap grid place-items-center order-last shrink-0"
            style={{ width: 34, height: 34, color: theme.text }}
            aria-label="Скрыть диалог"
          >
            <EyeOff size={18} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenMembers}
          disabled={!onOpenMembers || isDirect}
          aria-label={isDirect ? 'Собеседник' : 'Участники комнаты'}
          className="min-w-0 flex-1 text-left tap"
        >
          <h1 className="text-[16px] font-semibold truncate" style={{ color: theme.text, letterSpacing: '-0.01em' }}>
            {label}
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
              {isDirect ? (
                <span className="inline-flex items-center gap-1 min-w-0 align-middle">
                  <span className="shrink-0">@{counterpart?.username ?? ''} ·</span>
                  <PresenceBadge
                    online={counterpartOnline}
                    lastSeenAt={counterpart?.last_seen_at ?? null}
                    theme={theme}
                    fontSize={12.5}
                  />
                </span>
              ) : (
                roomSubtitle
              )}
            </p>
          )}
        </button>
      </div>

      {/* Скрытие обратимо, но неожиданно: подтверждаем одним лишним нажатием. */}
      {hideConfirm ? (
        <div
          role="alertdialog"
          aria-label="Скрыть диалог из списка?"
          className="flex items-center gap-2 mt-2 px-3 py-2"
          style={{ background: theme.surface, borderRadius: RADIUS.sm }}
        >
          <p className="flex-1 text-[13.5px]" style={{ color: theme.text }}>
            Скрыть диалог из списка? Переписка сохранится и вернётся с новым сообщением.
          </p>
          <button
            type="button"
            onClick={() => {
              setHideConfirm(false);
              void onHide?.();
            }}
            className="tap text-[13.5px] font-medium px-3 py-1.5"
            style={{ background: theme.text, color: theme.bg, borderRadius: 10 }}
          >
            Скрыть
          </button>
          <button
            type="button"
            onClick={() => setHideConfirm(false)}
            className="tap text-[13.5px] px-2 py-1.5"
            style={{ color: theme.muted }}
          >
            Отмена
          </button>
        </div>
      ) : null}
      </header>
  );

  const renderComposer = () => (
      <div
        ref={composerRef}
        // Панель во всю ширину; при открытой клавиатуре стоит вплотную к ней,
        // при закрытой — отступает на нижнюю полосу видимой области.
        // `sticky bottom-0` — страховка: панель остаётся у нижнего края и там,
        // где она окажется внутри прокручиваемой области, а не закреплённым
        // низом Screen. Ширину панель не превышает никогда: max-w-full.
        data-testid="composer"
        className={`sticky bottom-0 w-full max-w-full px-2 pt-2 blur-chrome ${keyboard > 0 ? 'pb-2' : 'safe-bottom'}`}
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

        {editing && canWrite ? (
          <div
            role="status"
            aria-label="Редактирование сообщения"
            className="flex items-center gap-2 mb-2 px-3 py-1.5 text-[13px]"
            style={{ background: theme.amberSoft, borderRadius: RADIUS.sm, color: theme.amberText }}
          >
            <Pencil size={13} className="shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 truncate">Редактирование: {editing.body}</span>
            <button type="button" aria-label="Отменить редактирование" onClick={cancelEdit} className="tap">
              ✕
            </button>
          </div>
        ) : null}

        {replyTo && !editing && canWrite ? (
          <div
            role="status"
            aria-label="Ответ на сообщение"
            className="flex items-center gap-2 mb-2 px-3 py-1.5 text-[13px]"
            style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.muted }}
          >
            <span className="flex-1 min-w-0 truncate">
              Ответ {namesById.get(replyTo.author_id) ?? replyTo.author_name ?? ''}:{' '}
              {replyTo.body || (replyTo.attachments.length > 0 ? 'Вложение' : '')}
            </span>
            <button type="button" aria-label="Отменить ответ" onClick={() => setReplyTo(null)} className="tap">
              ✕
            </button>
          </div>
        ) : null}

        {attachments.length > 0 && canWrite && !editing ? (
          <ComposerAttachments
            items={attachments}
            theme={theme}
            onRemove={(localId) => onRemoveAttachment?.(localId)}
            onRetry={(localId) => onRetryAttachment?.(localId)}
          />
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

        {mentionOpen ? (
          <div className="mb-2 px-1 enter">
            <MentionPicker
              matches={mentionMatches}
              filter={mentionFilter}
              activeIndex={Math.min(mentionIndex, mentionMatches.length - 1)}
              theme={theme}
              presentUserIds={presentUserIds}
              onActivate={setMentionIndex}
              onPick={insertMention}
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
            // Строка ввода не имеет права быть шире экрана: `min-w-0` снимает
            // с гибких детей запрет сжиматься ниже их собственной ширины (у
            // textarea она берётся из cols и на узком телефоне не помещается),
            // а `overflow-hidden` не даёт ничему вылезти за скруглённый край.
            data-testid="composer-row"
            className="flex items-end gap-1.5 w-full min-w-0 max-w-full overflow-hidden p-1.5"
            style={{
              background: theme.surface,
              borderRadius: 22,
              boxShadow: magicBusy ? `0 0 0 2px ${theme.amber}` : '0 1px 3px rgba(20,19,26,.10)',
              transition: 'box-shadow .3s ease',
            }}
          >
            {onPickFiles && !editing ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  className="hidden"
                  data-testid="attachment-input"
                  onChange={(event) => {
                    const picked = Array.from(event.target.files ?? []);
                    if (picked.length > 0) onPickFiles(picked);
                    // Сброс: тот же файл можно выбрать повторно.
                    event.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  aria-label="Приложить файлы"
                  className="tap grid place-items-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 18, background: theme.surfaceAlt, color: theme.muted }}
                >
                  <Paperclip size={18} />
                </button>
              </>
            ) : null}

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
                setCaret(event.target.selectionStart ?? event.target.value.length);
                // Текст изменился — список упоминаний снова вправе появиться.
                setMentionDismissed(false);
                setMentionIndex(0);
                if (event.target.value.trim() !== '') onTyping();
              }}
              onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
              onKeyDown={(event) => {
                // Пока открыт список упоминаний, стрелки, Enter и Tab
                // принадлежат ему: перенос строки и отправка ждут (design 3).
                if (mentionOpen) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const step = event.key === 'ArrowDown' ? 1 : -1;
                    const count = mentionMatches.length;
                    setMentionIndex((current) => (Math.min(current, count - 1) + step + count) % count);

                    return;
                  }

                  if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault();
                    if (activeMention) insertMention(activeMention);

                    return;
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setMentionDismissed(true);

                    return;
                  }
                }

                // Escape выходит из правки — как крестик на плашке.
                if (event.key === 'Escape' && editing !== null) {
                  event.preventDefault();
                  cancelEdit();

                  return;
                }

                if (event.key === 'Enter' && !event.shiftKey && sendOnEnter) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder={editing ? 'Правка сообщения' : 'Сообщение'}
              enterKeyHint={sendOnEnter ? 'send' : 'enter'}
              autoCapitalize="sentences"
              autoCorrect="on"
              className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2.5 outline-none field-focus"
              style={{
                color: theme.text,
                // Поле не ниже соседних кнопок: узкая полоска под палец неудобна.
                minHeight: 40,
                maxHeight: 116,
                fontSize: Math.max(MIN_INPUT_FONT, fontSize),
                lineHeight: 1.35,
              }}
            />

            {/* Эмодзи, помощник и отправка — одна нерастяжимая группа с общим
                шагом: длинный текст отнимает ширину у поля, а не у кнопок. */}
            <div data-testid="composer-actions" className="flex items-end gap-1.5 shrink-0">
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
                disabled={!canSend}
                className="grid place-items-center shrink-0 tap"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: theme.text,
                  color: theme.bg,
                  transform: canSend ? 'scale(1)' : 'scale(.6)',
                  opacity: canSend ? 1 : 0,
                  // Отступ уезжает вместе с кнопкой: строка обрезана по краю,
                  // и без плавного margin кнопка исчезала бы скачком.
                  transition: `transform .26s ${SPRING}, opacity .2s ease, margin-right .26s ${SPRING}`,
                  marginRight: canSend ? 0 : -42,
                }}
                aria-label={editing ? 'Сохранить правку' : 'Отправить'}
              >
                {editing ? <Check size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
  );

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      {wallpaperUrl ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: `center / cover no-repeat url(${wallpaperUrl})` }}
          />
          {/* Подложка, а не надежда на удачную картинку: человек принесёт
              любое изображение, а текст обязан остаться читаемым. */}
          <div
            aria-hidden="true"
            data-testid="wallpaper-scrim"
            className="absolute inset-0 pointer-events-none"
            style={{ background: theme.bg, opacity: 0.78 }}
          />
        </>
      ) : null}
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
                <Avatar userId={group.authorId} name={author} src={avatars.get(group.authorId)} size={30} theme={theme} />

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
                      usernames={usernames}
                      currentUserId={currentUserId}
                      onReply={startReply}
                      onQuickReaction={(target) => onToggleReaction(target.id, QUICK_REACTION)}
                      onOpenActions={setActionsFor}
                      onToggleReaction={onToggleReaction}
                      onJump={jumpToMessage}
                      onOpenAttachment={openGallery}
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
        onEdit={onEditMessage ? startEdit : undefined}
        onDelete={(message) => onDeleteMessage(message.id)}
        onCopied={(ok) => onToast?.(ok ? 'Текст скопирован' : 'Не удалось скопировать текст')}
      />

      {/* Монтируем только открытым: запрос поиска не живёт фоном. */}
      {searchOpen ? (
        <SearchSheet
        open
        roomId={room.id}
        roomName={label}
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

      {gallery !== null ? (
        <AttachmentGallery
          images={gallery.images}
          initialIndex={gallery.index}
          onClose={() => setGallery(null)}
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
