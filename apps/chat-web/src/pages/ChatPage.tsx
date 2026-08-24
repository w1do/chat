import {
  ChatScreen,
  MagicSheet,
  RoomsScreen,
  useCreateRoom,
  useDeleteMessage,
  useMembers,
  useMembershipActions,
  useMessages,
  useReactions,
  useRealtimeRoom,
  useRoom,
  useRooms,
  useSendMessage,
  useTyping,
  type MagicAction,
  type MagicPhase,
} from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import { THEMES, Toast, useKeyboardInsets, useTheme, type ThemeTokens } from '@vendor/ui';
import { MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../app/api';
import { realtimeAdapter } from '../app/echo';
import { runtimeConfig } from '../app/runtime-config';
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
  const { keyboard, height } = useKeyboardInsets();

  const theme: ThemeTokens = THEMES[settings.theme];
  const [tab, setTab] = useState<'chats' | 'settings'>('chats');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rooms = useRooms();
  const createRoom = useCreateRoom();
  const chatOpen = Boolean(roomId);

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

  return (
    <div
      className="w-full flex justify-center"
      style={{ background: theme.bg, height: height ? `${height}px` : '100dvh', overflow: 'hidden' }}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden ${settings.animations ? '' : 'still'}`}
        style={{ height: '100%', background: theme.bg, color: theme.text }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: chatOpen ? 'translateX(-22%)' : 'none',
            filter: chatOpen ? 'brightness(.94)' : 'none',
            transition: `transform .4s ${SPRING}, filter .4s ease`,
          }}
        >
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
          className="absolute inset-0"
          style={{
            transform: chatOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: `transform .42s ${SPRING}`,
            boxShadow: '-16px 0 40px rgba(0,0,0,.20)',
          }}
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
  const { typingUserIds, connection } = useRealtimeRoom(realtimeAdapter(), roomId, { enabled: isMember });

  const [draft, setDraft] = useState('');
  const [undoText, setUndoText] = useState<string | null>(null);
  const [magic, setMagic] = useState<{
    open: boolean;
    phase: MagicPhase;
    action: MagicAction | null;
    suggestion: string | null;
    error: string | null;
  }>({ open: false, phase: 'menu', action: null, suggestion: null, error: null });

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
        magicBusy={magic.open && magic.phase === 'loading'}
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
            setMagic({ open: true, phase: 'unavailable', action: null, suggestion: null, error: null });

            return;
          }
          if (text.trim().length < 2) {
            onToast('Напишите черновик — помощник его поправит');

            return;
          }
          setMagic({ open: true, phase: 'menu', action: null, suggestion: null, error: null });
        }}
        onUndoMagic={() => {
          if (undoText === null) return;
          setDraft(undoText);
          setUndoText(null);
        }}
      />

      <MagicSheet
        open={magic.open}
        phase={magic.phase}
        action={magic.action}
        original={draft}
        suggestion={magic.suggestion}
        error={magic.error}
        theme={theme}
        onRun={(action) => {
          // Вызов /ai/message-revisions появится на этапе 10; пока честная ошибка.
          setMagic({
            open: true,
            phase: 'error',
            action,
            suggestion: null,
            error: 'Помощник ещё не подключён на этом сервере.',
          });
        }}
        onApply={() => {
          if (magic.suggestion === null) return;
          setUndoText(draft);
          setDraft(magic.suggestion);
          setMagic({ open: false, phase: 'menu', action: null, suggestion: null, error: null });
        }}
        onClose={() => setMagic({ open: false, phase: 'menu', action: null, suggestion: null, error: null })}
      />
    </>
  );
}
