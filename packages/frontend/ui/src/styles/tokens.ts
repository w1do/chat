// Токены оформления мобильного интерфейса.
// Цвет несёт одну мысль — чей голос; янтарный зарезервирован за помощником.
//
// Вторичный текст (`muted`) обязан читаться, а не намекать: он держит 4.5:1
// (WCAG 2.2 AA) на всех трёх фонах темы — `bg`, `surface` и `surfaceAlt`.
// Проверять надо по худшему из них: на `surfaceAlt` запаса меньше всего.

export type ThemeName = 'light' | 'dark';

export interface ThemeTokens {
  name: ThemeName;
  bg: string;
  surface: string;
  surfaceAlt: string;
  hairline: string;
  text: string;
  muted: string;
  faint: string;
  own: string;
  ownText: string;
  amber: string;
  amberSoft: string;
  amberText: string;
  chromeAlpha: string;
  danger: string;
}

export const LIGHT: ThemeTokens = {
  name: 'light',
  bg: '#F4F4F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EDEDF3',
  hairline: '#E4E4EC',
  text: '#14131A',
  muted: '#6A6974',
  faint: '#B6B5BE',
  own: '#17161E',
  ownText: '#FFFFFF',
  amber: '#E0900E',
  amberSoft: '#FCEFD5',
  amberText: '#8A5606',
  chromeAlpha: '#FFFFFFD9',
  danger: '#C4453D',
};

export const DARK: ThemeTokens = {
  name: 'dark',
  bg: '#0D0D11',
  surface: '#17171D',
  surfaceAlt: '#20202A',
  hairline: '#282833',
  text: '#ECECF2',
  muted: '#9695A1',
  faint: '#5C5B66',
  own: '#ECECF2',
  ownText: '#14131A',
  amber: '#F5B547',
  amberSoft: '#2E2413',
  amberText: '#F5C878',
  chromeAlpha: '#17171DD9',
  danger: '#E06B62',
};

export const THEMES: Record<ThemeName, ThemeTokens> = { light: LIGHT, dark: DARK };

export const RADIUS = { sm: 10, md: 14, bubble: 20, sheet: 28 } as const;
/** Присутствие — один зелёный на всё приложение: точка у аватарки и в подписи. */
export const ONLINE = '#35C08A';
export const SPRING = 'cubic-bezier(.2,.9,.3,1)';

export type TextSize = 'S' | 'M' | 'L';
export const TEXT_SIZE_PX: Record<TextSize, number> = { S: 15, M: 16.5, L: 18.5 };
/** Меньше 16px iOS Safari зумит поле ввода при фокусе. */
export const MIN_INPUT_FONT = 16;

/**
 * Личный цвет голоса участника. Бэкенд его не хранит, поэтому оттенок
 * выводится детерминированно из идентификатора — у человека он всегда один.
 */
export function voiceHue(userId: string): string {
  const palette = ['#6C63C9', '#2F8F7A', '#C75C8A', '#DD8A3C', '#8A7BB5', '#3F7BC4', '#B0574F'];
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;

  return palette[hash % palette.length]!;
}

/** Полупрозрачная подложка поверх «своего» пузыря (цитата ответа). */
export function overlayOnOwn(theme: ThemeTokens): string {
  return `${theme.ownText}1A`;
}

/** Эмодзи-обложка комнаты: бэкенд её не хранит, выводим из имени. */
export function roomEmoji(name: string): string {
  const emojis = ['🏡', '🍎', '📌', '⛺️', '🎮', '🔐', '💰', '📚', '🎧', '🌿'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;

  return emojis[hash % emojis.length]!;
}
