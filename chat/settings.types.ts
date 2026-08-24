/* ============================================================================
   НАСТРОЙКИ, ОФОРМЛЕНИЕ И ЗВУК — типы
   Дополняет chat.types.ts (домен) и permissions.ts (права).

   Карта файла:
     1. Тема и токены оформления
     2. Настройки пользователя
     3. Модели помощника
     4. Звук и тактильный отклик
     5. Индикатор «печатает…»
     6. Анимации и переходы экранов
     7. Хранение и синхронизация настроек
   ========================================================================== */

import type { FamilyRole, MagicAction, RoomId, UserId } from './chat.types';

/* ── 1. Тема и токены оформления ─────────────────────────────────────────── */

export type ThemeName = 'light' | 'dark';

/** Все цвета интерфейса. Обе темы обязаны иметь одинаковый набор ключей. */
export interface ThemeTokens {
  name: ThemeName;
  bg: string;          // фон экрана
  surface: string;     // карточки, пузыри собеседников, панели
  surfaceAlt: string;  // подложки внутри карточек
  text: string;
  muted: string;       // вторичный текст
  border: string;
  accent: string;      // основной цвет: свои сообщения, активные вкладки
  magic: string;       // цвет помощника
  magicInk: string;    // текст поверх «магического» фона
  coral: string;       // ошибки и предупреждения
  chrome: string;      // шапки и статус-бар
  chromeText: string;
  own: string;         // фон своего сообщения
  ownText: string;
}

export type ThemeMap = Record<ThemeName, ThemeTokens>;

export type TextSize = 'S' | 'M' | 'L';

/* ── 2. Настройки пользователя ───────────────────────────────────────────── */

export interface AppSettings {
  /* Внешний вид */
  theme: ThemeName;
  /** Выключение убирает все анимации и переходы. */
  animations: boolean;
  textSize: TextSize;

  /* Звук и отклик */
  sound: boolean;
  vibration: boolean;

  /* Чат */
  showTyping: boolean;
  sendOnEnter: boolean;

  /* Помощник */
  model: ModelId;
  /** true — сначала показать «Было → Стало», false — заменять сразу. */
  confirmRewrite: boolean;
  /** Родительский переключатель: выдать роли «дети» право ai.enhance. */
  aiForKids: boolean;
}

export type SettingKey = keyof AppSettings;

/** Точечное изменение одной настройки: set('theme', 'dark'). */
export type SetSetting = <K extends SettingKey>(key: K, value: AppSettings[K]) => void;

/** Секции экрана настроек — порядок отображения. */
export type SettingsSection =
  | 'profile'
  | 'assistant'
  | 'sound'
  | 'appearance'
  | 'chat'
  | 'permissions';

/* ── 3. Модели помощника ─────────────────────────────────────────────────── */

export type ModelId = 'fast' | 'balanced' | 'smart';

export interface ModelOption {
  id: ModelId;
  label: string;
  hint: string;
  /** Строка модели для запроса к API. */
  model: string;
}

/** Что уходит на бэкенд вместе с текстом. */
export interface EnhanceOptions {
  action: MagicAction;
  model: ModelId;
  roomId: RoomId;
  authorId: UserId;
  authorRole: FamilyRole;
}

/* ── 4. Звук и тактильный отклик ─────────────────────────────────────────── */

export type SoundKind = 'send' | 'receive' | 'magic' | 'tap';

/** Пара [частота в Гц, задержка в секундах] — из них собирается сигнал. */
export type Tone = readonly [number, number];
export type SoundBank = Record<SoundKind, readonly Tone[]>;

export type VibrationPattern = number | number[];

export interface FeedbackApi {
  play: (kind: SoundKind, enabled: boolean) => void;
  vibrate: (pattern: VibrationPattern, enabled: boolean) => void;
}

/* ── 5. Индикатор «печатает…» ────────────────────────────────────────────── */

/** Кто печатает в каждой комнате: roomId → userId (или null). */
export type TypingByRoom = Record<RoomId, UserId | null>;

export interface TypingEvent {
  roomId: RoomId;
  userId: UserId;
  /** Индикатор гаснет сам, если событие не повторилось. */
  expiresInMs: number;
}

/* ── 6. Анимации и переходы экранов ──────────────────────────────────────── */

export type Tab = 'rooms' | 'settings';

/** Слои интерфейса: чат выезжает поверх вкладок. */
export interface NavigationState {
  tab: Tab;
  chatOpen: boolean;
  activeRoomId: RoomId;
}

export type AnimationName =
  | 'rise'        // появление снизу
  | 'rise-left'   // сообщение собеседника
  | 'rise-right'  // своё сообщение
  | 'pop'         // реакция и счётчик непрочитанного
  | 'dot'         // точки «печатает…»
  | 'shimmer'     // ожидание ответа модели
  | 'glow';       // подсветка поля ввода во время работы помощника

export interface MotionTokens {
  /** Длительности в миллисекундах. */
  fast: number;      // нажатия
  base: number;      // появление элементов
  screen: number;    // переход между экранами
  /** Кривая пружины для сдвигов и модального окна. */
  spring: string;    // cubic-bezier(.22,1.1,.36,1)
}

/* ── 7. Хранение и синхронизация настроек ────────────────────────────────── */

/** Локальное хранилище устройства (AsyncStorage / MMKV в React Native). */
export interface SettingsStorage {
  load: () => Promise<Partial<AppSettings> | null>;
  save: (settings: AppSettings) => Promise<void>;
  clear: () => Promise<void>;
}

/** PATCH /api/me/settings — настройки, общие для всех устройств. */
export type SyncedSettings = Pick<AppSettings, 'model' | 'confirmRewrite' | 'aiForKids' | 'showTyping'>;

/** Настройки только этого устройства — на сервер не уходят. */
export type LocalOnlySettings = Omit<AppSettings, keyof SyncedSettings>;
