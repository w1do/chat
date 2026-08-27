import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, type ThemeTokens } from '../src/styles/tokens';

/** Относительная яркость цвета по WCAG 2.x. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** Контраст пары цветов: 4.5:1 — порог обычного текста в WCAG 2.2 AA. */
function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];

  return (light + 0.05) / (dark + 0.05);
}

const TEXT_AA = 4.5;
/** Значки и границы — нетекстовый контраст, WCAG 1.4.11. */
const NON_TEXT_AA = 3;

const surfaces: Array<keyof ThemeTokens> = ['bg', 'surface', 'surfaceAlt'];

describe.each([
  ['светлая', LIGHT],
  ['тёмная', DARK],
])('%s тема', (_name, theme) => {
  it.each(surfaces)('читает основной текст на %s', (surface) => {
    expect(contrast(theme.text, theme[surface])).toBeGreaterThanOrEqual(TEXT_AA);
  });

  // Вторичный текст — подписи полей, ники, подсказки, описания комнат. Он
  // обязан читаться на всех трёх фонах: подпись поля лежит на `surface`,
  // строка списка — на `bg`, а поле ввода и кнопки — на `surfaceAlt`.
  it.each(surfaces)('читает вторичный текст на %s', (surface) => {
    expect(contrast(theme.muted, theme[surface])).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it('читает ошибку на карточке', () => {
    expect(contrast(theme.danger, theme.surface)).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it('читает подпись помощника на его же подложке', () => {
    expect(contrast(theme.amberText, theme.amberSoft)).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it('различает значок отправки на кнопке', () => {
    expect(contrast(theme.bg, theme.text)).toBeGreaterThanOrEqual(NON_TEXT_AA);
  });
});
