import {
  ChatScreen,
  MagicSheet,
  RoomsScreen,
  useCreateRoom,
  useDeleteMessage,
  useMembers,
  useMembershipActions,
  useIncomingMessages,
  useMessages,
  useNotificationPermission,
  useReactions,
  useRealtimeRoom,
  useRevision,
  useRoom,
  useRooms,
  useSendMessage,
  useTyping,
  type MagicAction,
  type MagicPhase,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import {
  Confetti,
  THEMES,
  Toast,
  useKeyboardInsets,
  useMediaQuery,
  useTheme,
  type ThemeTokens,
} from '@vendor/ui';
import { MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../app/api';
import { realtimeAdapter } from '../app/echo';
import { runtimeConfig } from '../app/runtime-config';
import { applyTabCounter, raiseSystemNotification } from '../app/notifications';
import { useNotificationFeed } from '@vendor/notifications';
import { useInstallPrompt } from '../app/install';
import { useSettings, type AppSettings } from '../app/settings';
import { SettingsScreen } from './SettingsScreen';

const SPRING = 'cubic-bezier(.2,.9,.3,1)';

/**
 * Мобильная оболочка: слой вкладок («Чаты» / «Настройки») и слой переписки,
 * который выезжает поверх. Экраны берут данные из реального API.
 */
export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, set } = useSettings();
  const { setTheme } = useTheme();
  const { keyboard, height, offsetTop } = useKeyboardInsets();

  const theme: ThemeTokens = THEMES[settings.theme];
  const [tab, setTab] = useState<'chats' | 'settings'>('chats');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rooms = useRooms();
  const createRoom = useCreateRoom();
  const notifications = useNotificationFeed();
  const chatOpen = Boolean(roomId);
  // Раскладка выбирается по ширине окна: user-agent врёт на планшетах и в
  // режиме рабочего стола браузера.
  const wide = useMediaQuery('(min-width: 1024px)');
  const install = useInstallPrompt();

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const totalUnread = (rooms.data ?? []).reduce((sum, room) => sum + (room.unread_count ?? 0), 0);

  // Счётчик в заголовке вкладки повторяет бейджи списка.
  useEffect(() => applyTabCounter(totalUnread), [totalUnread]);

  const { permission, request: requestNotifications } = useNotificationPermission();

  useIncomingMessages(realtimeAdapter(), {
    rooms: new Map((rooms.data ?? []).filter((room) => room.my_role !== null).map((room) => [room.id, room.name])),
    currentUserId: user?.id ?? '',
    activeRoomId: roomId,
    onNotice: (message) => {
      showToast(`${message.roomName} · ${message.authorName}: ${message.body}`);
      void rooms.refetch();
      raiseSystemNotification(message, (id) => navigate(`/rooms/${id}`));
    },
  });

  return (
    // Приложение живёт ровно в видимой области и компенсирует прокрутку,
    // которую iOS Safari делает сам при открытии клавиатуры.
    <div
      className="w-full flex justify-center"
      style={{
        background: theme.bg,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: height ? `${height}px` : '100dvh',
        transform: offsetTop ? `translateY(${offsetTop}px)` : undefined,
        overflow: 'hidden',
      }}
    >
      <div
        className={`relative w-full overflow-hidden ${wide ? 'flex' : 'max-w-md'} ${settings.animations ? '' : 'still'}`}
        style={{ height: '100%', background: theme.bg, color: theme.text }}
      >
        <div
          className={wide ? 'relative shrink-0' : 'absolute inset-0'}
          style={
            wide
              ? { width: 380, height: '100%', borderRight: `1px solid ${theme.hairline}` }
              : {
                  transform: chatOpen ? 'translateX(-22%)' : 'none',
                  filter: chatOpen ? 'brightness(.94)' : 'none',
                  transition: `transform .4s ${SPRING}, filter .4s ease`,
                }
          }
        >
          {tab === 'chats' && install.canInstall ? (
            <div
              role="status"
              className="absolute left-0 right-0 z-20 px-3"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 74px)' }}
            >
              <div
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ background: theme.surface, borderRadius: 16, boxShadow: '0 8px 30px rgba(20,19,26,.16)' }}
              >
                <span aria-hidden="true" style={{ fontSize: 22 }}>
                  📲
                </span>
                <p className="flex-1 text-[13.5px]" style={{ color: theme.text }}>
                  Поставьте чат на экран «Домой» — так приходят уведомления.
                </p>
                <button
                  type="button"
                  onClick={() => void install.install()}
                  className="tap text-[13.5px] font-medium px-3 py-1.5"
                  style={{ background: theme.text, color: theme.bg, borderRadius: 12 }}
                >
                  Установить
                </button>
                <button
                  type="button"
                  onClick={install.dismiss}
                  aria-label="Скрыть предложение установки"
                  className="tap text-[13.5px] px-1"
                  style={{ color: theme.muted }}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'chats' ? (
            <RoomsScreen
              rooms={rooms.data}
              isLoading={rooms.isLoading}
              error={rooms.error ?? undefined}
              theme={theme}
              currentUser={user ? { id: user.id, name: user.name } : null}
              onOpen={(id) => navigate(`/rooms/${id}`)}
              onRetry={() => void rooms.refetch()}
              onProfile={() => setTab('settings')}
              onOpenNotifications={() => navigate('/notifications')}
              unreadNotifications={notifications.data?.meta.unread ?? 0}
              onCreateRoom={async (input) => {
                const room = await createRoom.mutateAsync(input);
                navigate(`/rooms/${room.id}`);
              }}
            />
          ) : (
            <SettingsScreen
              theme={theme}
              settings={settings}
              onChange={(key, value) => {
                set(key, value);
                if (key === 'theme') setTheme(value as AppSettings['theme']);
              }}
              notificationPermission={permission}
              onRequestNotifications={async () => {
                await requestNotifications();
                showToast('Настройки уведомлений обновлены');
              }}
              onToast={showToast}
            />
          )}

          <nav
            aria-label="Разделы"
            className="absolute left-1/2 flex gap-1 p-1.5 blur-chrome"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
              transform: 'translateX(-50%)',
              background: theme.chromeAlpha,
              borderRadius: 22,
              boxShadow: '0 8px 30px rgba(20,19,26,.16)',
            }}
          >
            {[
              { id: 'chats' as const, label: 'Чаты', Icon: MessageCircle },
              { id: 'settings' as const, label: 'Настройки', Icon: SettingsIcon },
            ].map((item) => {
              const active = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                  className="flex items-center gap-2 tap"
                  style={{
                    padding: '9px 16px',
                    borderRadius: 18,
                    background: active ? theme.text : 'transparent',
                    color: active ? theme.bg : theme.muted,
                    transition: `background .28s ${SPRING}, color .2s ease`,
                  }}
                >
                  <span className="relative grid place-items-center">
                    <item.Icon size={18} />
                    {item.id === 'chats' && totalUnread > 0 && !active ? (
                      <span
                        aria-label={`Непрочитанных: ${totalUnread}`}
                        className="absolute pop"
                        style={{ top: -3, right: -5, width: 7, height: 7, borderRadius: 4, background: theme.amber }}
                      />
                    ) : null}
                  </span>
                  <span className="text-[14px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className={wide ? 'relative flex-1 min-w-0' : 'absolute inset-0'}
          style={
            wide
              ? { height: '100%' }
              : {
                  transform: chatOpen ? 'translateX(0)' : 'translateX(100%)',
                  transition: `transform .42s ${SPRING}`,
                  boxShadow: '-16px 0 40px rgba(0,0,0,.20)',
                }
          }
        >
          {roomId ? (
            <ActiveRoom
              roomId={roomId}
              theme={theme}
              settings={settings}
              keyboard={keyboard}
              currentUserId={user?.id ?? ''}
              onBack={() => navigate('/')}
              onOpenMembers={() => navigate(`/rooms/${roomId}/settings`)}
              onToast={showToast}
            />
          ) : wide ? (
            // Правая колонка не пустует: она объясняет, что делать дальше.
            <div className="h-full grid place-items-center px-8 text-center">
              <div>
                <span aria-hidden="true" style={{ fontSize: 44 }}>
                  💬
                </span>
                <p className="text-[17px] font-medium mt-3" style={{ color: theme.text }}>
                  Выберите комнату слева
                </p>
                <p className="text-[14px] mt-1" style={{ color: theme.muted }}>
                  Или создайте новую — семья, дом, что угодно.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <Toast text={toast} theme={theme} bottom={chatOpen ? 96 : 100} />
      </div>
    </div>
  );
}

function ActiveRoom({
  roomId,
  theme,
  settings,
  keyboard,
  currentUserId,
  onBack,
  onOpenMembers,
  onToast,
}: {
  roomId: string;
  theme: ThemeTokens;
  settings: AppSettings;
  keyboard: number;
  currentUserId: string;
  onBack: () => void;
  onOpenMembers: () => void;
  onToast: (text: string) => void;
}) {
  const room = useRoom(roomId);
  const members = useMembers(roomId);
  const messages = useMessages(roomId);
  const send = useSendMessage(roomId, currentUserId);
  const remove = useDeleteMessage(roomId);
  const react = useReactions(roomId);
  const typing = useTyping(roomId);
  const membership = useMembershipActions(roomId);

  const isMember = room.data?.my_role != null;
  const { typingUserIds, connection, joinGreeting, dismissGreeting } = useRealtimeRoom(
    realtimeAdapter(),
    roomId,
    { enabled: isMember },
  );

  const prefersReducedMotion =
    typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  const [draft, setDraft] = useState('');
  const [undoText, setUndoText] = useState<string | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicPhase, setMagicPhase] = useState<MagicPhase>('menu');
  const revision = useRevision();

  const flatMessages = messages.data?.pages.flatMap((page) => page.data) ?? [];
  const newestId = flatMessages[0]?.id;
  const aiEnabled = runtimeConfig().ai.enabled === 'true';

  // Отметка прочтения: комната открыта и в ней есть сохранённые сообщения.
  useEffect(() => {
    if (!isMember || !newestId || newestId.startsWith('optimistic-')) return;

    void apiClient()
      .post(`/rooms/${roomId}/read`, { body: { last_read_message_id: newestId } })
      .catch(() => {
        // счётчик обновится при следующем открытии — молча
      });
  }, [roomId, newestId, isMember]);

  if (room.isLoading) {
    return (
      <p aria-busy="true" className="p-6 text-[15px]" style={{ background: theme.bg, color: theme.muted, height: '100%' }}>
        Загрузка комнаты…
      </p>
    );
  }

  if (room.error || !room.data) {
    return (
      <div style={{ background: theme.bg, height: '100%' }} className="p-6">
        <p role="alert" className="text-[15px]" style={{ color: theme.danger }}>
          Не удалось открыть комнату.
        </p>
        <button type="button" onClick={onBack} className="mt-3 text-[15px] tap" style={{ color: theme.text }}>
          Назад к списку
        </button>
      </div>
    );
  }

  return (
    <>
      <ChatScreen
        room={room.data}
        messages={flatMessages}
        members={members.data ?? []}
        currentUserId={currentUserId}
        theme={theme}
        textSize={settings.textSize}
        sendOnEnter={settings.sendOnEnter}
        showTyping={settings.showTyping}
        typingUserIds={typingUserIds}
        connection={connection}
        keyboard={keyboard}
        isLoading={messages.isLoading}
        error={messages.error ?? undefined}
        hasMore={messages.hasNextPage}
        aiEnabled={aiEnabled}
        undoText={undoText}
        magicBusy={magicOpen && revision.state.phase === 'loading'}
        draft={draft}
        onDraftChange={(text) => {
          setDraft(text);
          if (undoText !== null && text === '') setUndoText(null);
        }}
        onBack={onBack}
        onOpenMembers={onOpenMembers}
        onLoadMore={() => void messages.fetchNextPage()}
        onSend={async (input) => {
          typing.stopTyping();
          await send.mutateAsync(input);
          setUndoText(null);
        }}
        onTyping={typing.notifyTyping}
        onToggleReaction={(messageId, emoji) => react.mutate({ messageId, emoji })}
        onDeleteMessage={(messageId) => void remove.mutateAsync(messageId)}
        onJoin={async () => {
          await membership.join.mutateAsync();
          await room.refetch();
          onToast('Вы вступили в комнату');
        }}
        onMagic={(text) => {
          if (!aiEnabled) {
            setMagicPhase('unavailable');
            setMagicOpen(true);

            return;
          }
          if (text.trim().length < 2) {
            onToast('Напишите черновик — помощник его поправит');

            return;
          }
          revision.reset();
          setMagicPhase('menu');
          setMagicOpen(true);
        }}
        onUndoMagic={() => {
          if (undoText === null) return;
          setDraft(undoText);
          setUndoText(null);
        }}
      />

      <Confetti
        active={joinGreeting !== null}
        message={joinGreeting ? `К нам подключился ${joinGreeting.name}` : ''}
        theme={theme}
        reducedMotion={!settings.animations || prefersReducedMotion}
        onDone={dismissGreeting}
      />

      <MagicSheet
        open={magicOpen}
        phase={magicPhase === 'unavailable' ? 'unavailable' : (revision.state.phase === 'idle' ? 'menu' : revision.state.phase)}
        action={revision.state.operation as MagicAction | null}
        original={draft}
        suggestion={revision.state.suggestion}
        error={revision.state.error}
        theme={theme}
        onRun={(action, tone) => {
          void revision.run({
            operation: action,
            text: draft.trim(),
            ...(tone ? { tone: tone as 'softer' } : {}),
          });
        }}
        onCancel={() => {
          revision.cancel();
          setMagicOpen(false);
        }}
        onApply={() => {
          const suggestion = revision.state.suggestion;
          if (suggestion === null) return;
          // Замена черновика — только по явному действию; исходник можно вернуть.
          setUndoText(draft);
          setDraft(suggestion);
          revision.reset();
          setMagicOpen(false);
        }}
        onClose={() => {
          revision.cancel();
          setMagicOpen(false);
        }}
      />
    </>
  );
}
