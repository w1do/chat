import { Avatar, Dots, RADIUS, Screen, voiceHue, type ThemeTokens } from '@vendor/ui';
import { RoomGlyph } from '../RoomGlyph';
import { Bell, Lock, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Room } from '../../schemas/room';
import { formatTime } from '../../format';

interface RoomsScreenProps {
  rooms: Room[] | undefined;
  isLoading: boolean;
  error?: unknown;
  theme: ThemeTokens;
  currentUser: { id: string; name: string; avatarUrl?: string | null } | null;
  /** Кто сейчас печатает в комнате: roomId → имя. */
  typingByRoom?: Record<string, string>;
  onOpen: (roomId: string) => void;
  onRetry: () => void;
  onProfile: () => void;
  onOpenNotifications?: () => void;
  /** Непрочитанные уведомления — бейдж на колокольчике. */
  unreadNotifications?: number;
  onCreateRoom: (input: { name: string; visibility: 'public' | 'private' }) => Promise<unknown>;
}

/** Экран «Чаты»: список комнат, счётчики непрочитанного, создание комнаты. */
export function RoomsScreen({
  rooms,
  isLoading,
  error,
  theme,
  currentUser,
  typingByRoom = {},
  onOpen,
  onRetry,
  onProfile,
  onOpenNotifications,
  unreadNotifications = 0,
  onCreateRoom,
}: RoomsScreenProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [creating, setCreating] = useState(false);

  /** Шапка — закреплённый край Screen: список прокручивается под ней. */
  const renderHeader = () => (
      <header
        ref={headerRef}
        className="px-5 pb-3 safe-top blur-chrome"
        style={{ background: theme.chromeAlpha }}
      >
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold" style={{ color: theme.text, letterSpacing: '-0.035em' }}>
              Чаты
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: theme.muted }}>
              {rooms ? `${rooms.length} комнат` : '…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onOpenNotifications ? (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="tap relative grid place-items-center"
                aria-label={
                  unreadNotifications > 0
                    ? `Уведомления, непрочитанных: ${unreadNotifications}`
                    : 'Уведомления'
                }
                style={{ width: 40, height: 40, borderRadius: 14, background: theme.surfaceAlt, color: theme.text }}
              >
                <Bell size={18} />
                {unreadNotifications > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute pop"
                    style={{ top: 6, right: 6, width: 8, height: 8, borderRadius: 4, background: theme.amber }}
                  />
                ) : null}
              </button>
            ) : null}
            <button type="button" onClick={onProfile} className="tap" aria-label="Профиль">
            {currentUser ? (
              <Avatar userId={currentUser.id} name={currentUser.name} src={currentUser.avatarUrl} size={40} theme={theme} online />
            ) : null}
            </button>
          </div>
        </div>
      </header>
  );

  return (
    <Screen
      theme={theme}
      header={renderHeader()}
      contentStyle={{ paddingTop: 4, paddingBottom: 96 }}
    >
        <div className="px-3 pt-2">
          {isLoading ? (
            <p aria-busy="true" className="px-2 py-6 text-[15px]" style={{ color: theme.muted }}>
              Загрузка комнат…
            </p>
          ) : error ? (
            <div role="alert" className="px-2 py-6">
              <p className="text-[15px]" style={{ color: theme.text }}>
                Не удалось загрузить комнаты.
              </p>
              <button type="button" onClick={onRetry} className="mt-2 text-[15px] tap" style={{ color: theme.amberText }}>
                Повторить
              </button>
            </div>
          ) : !rooms || rooms.length === 0 ? (
            <p role="status" className="px-2 py-6 text-[15px]" style={{ color: theme.muted }}>
              Комнат пока нет — создайте первую.
            </p>
          ) : (
            <nav aria-label="Комнаты">
              <ul style={{ background: theme.surface, borderRadius: RADIUS.md, overflow: 'hidden' }}>
                {rooms.map((room, index) => {
                  const unread = room.unread_count ?? 0;
                  const typingName = typingByRoom[room.id];
                  const isMember = room.my_role !== null;

                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(room.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left tap enter"
                        style={{
                          borderBottom: index === rooms.length - 1 ? 'none' : `1px solid ${theme.hairline}`,
                          animationDelay: `${index * 0.035}s`,
                        }}
                      >
                        <RoomGlyph
                          name={room.name}
                          photoUrl={room.photo_url}
                          size={46}
                          radius={16}
                          theme={theme}
                        />

                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="text-[16px] font-semibold truncate"
                              style={{ color: theme.text, letterSpacing: '-0.01em' }}
                            >
                              {room.name}
                            </span>
                            {room.visibility === 'private' ? <Lock size={12} style={{ color: theme.faint }} /> : null}
                          </span>

                          {typingName ? (
                            <span className="flex items-center gap-1.5 mt-0.5 text-[14px]" style={{ color: theme.muted }}>
                              {typingName} печатает <Dots color={theme.muted} size={4} />
                            </span>
                          ) : (
                            <span className="block text-[14px] truncate mt-0.5" style={{ color: theme.muted }}>
                              {room.topic ?? (isMember ? 'Вы участник' : 'Открытая комната — можно вступить')}
                            </span>
                          )}
                        </span>

                        <span className="flex flex-col items-end gap-1 shrink-0" style={{ minWidth: 42 }}>
                          <span className="text-[12px] tnum" style={{ color: theme.faint }}>
                            {room.member_count ?? 0} 👤
                          </span>
                          {unread > 0 ? (
                            <span
                              aria-label={`Непрочитанных: ${unread}`}
                              className="pop text-[11.5px] font-semibold grid place-items-center"
                              style={{
                                minWidth: 20,
                                height: 20,
                                padding: '0 6px',
                                borderRadius: 10,
                                background: theme.text,
                                color: theme.bg,
                              }}
                            >
                              {unread}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <CreateRoomCard
            theme={theme}
            open={creating}
            onToggle={() => setCreating((value) => !value)}
            onSubmit={async (input) => {
              await onCreateRoom(input);
              setCreating(false);
            }}
          />
        </div>
    </Screen>
  );
}

function CreateRoomCard({
  theme,
  open,
  onToggle,
  onSubmit,
}: {
  theme: ThemeTokens;
  open: boolean;
  onToggle: () => void;
  onSubmit: (input: { name: string; visibility: 'public' | 'private' }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 mt-3 px-3 py-3 tap"
        style={{ background: theme.surface, borderRadius: RADIUS.md, color: theme.text }}
      >
        <span
          aria-hidden="true"
          className="grid place-items-center"
          style={{ width: 28, height: 28, borderRadius: 14, background: theme.surfaceAlt, color: voiceHue('new-room') }}
        >
          <Plus size={16} />
        </span>
        <span className="text-[16px]">Новая комната</span>
      </button>
    );
  }

  return (
    <form
      aria-label="create-room"
      className="mt-3 p-3"
      style={{ background: theme.surface, borderRadius: RADIUS.md }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError('Укажите название комнаты.');
          return;
        }
        setError(null);
        setBusy(true);
        try {
          await onSubmit({ name: name.trim(), visibility });
          setName('');
        } catch {
          setError('Не удалось создать комнату.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {error ? (
        <p role="alert" className="text-[13px] mb-2" style={{ color: theme.danger }}>
          {error}
        </p>
      ) : null}

      <label htmlFor="new-room-name" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
        Название
      </label>
      <input
        id="new-room-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full px-3 py-2 mb-3 outline-none"
        style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
      />

      <label htmlFor="new-room-visibility" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
        Видимость
      </label>
      <select
        id="new-room-visibility"
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
        className="w-full px-3 py-2 mb-3 outline-none"
        style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
      >
        <option value="public">Открытая — видна всем</option>
        <option value="private">Закрытая — только участникам</option>
      </select>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 py-2.5 tap text-[15px] font-medium"
          style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm }}
        >
          {busy ? 'Создаём…' : 'Создать'}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="px-4 py-2.5 tap text-[15px]"
          style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: RADIUS.sm }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
