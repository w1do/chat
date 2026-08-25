import { useEffect, useState } from 'react';

/**
 * Порог, ниже которого уменьшение вьюпорта — это панель браузера, а не
 * клавиатура. На iOS layout-вьюпорт выше визуального из-за адресной строки, и
 * без порога приложение считало бы клавиатуру открытой всегда — а значит
 * убирало бы нижний безопасный отступ и прятало панель ввода под системной
 * чертой.
 */
const KEYBOARD_MIN_PX = 120;

export interface KeyboardInsets {
  height: number;
  keyboard: number;
  offsetTop: number;
  /**
   * Полоса внизу, занятая элементами браузера и устройства: то же уменьшение
   * вьюпорта, но ниже порога клавиатуры. Безопасная зона (`env()`) описывает
   * только вырезы устройства и такую полосу не видит.
   */
  bottom: number;
}

/**
 * Геометрия видимой области: её высота, высота экранной клавиатуры, сдвиг
 * вьюпорта и нижняя полоса. Сдвиг нужен отдельно: iOS Safari при открытии
 * клавиатуры сам прокручивает документ, и без компенсации шапка уезжает за
 * верхний край.
 *
 * Без `visualViewport` измерить нечего: возвращается 0, а отступ считает CSS
 * по `env(safe-area-inset-bottom)` — запасной путь.
 */
export function useKeyboardInsets(): KeyboardInsets {
  const [state, setState] = useState<KeyboardInsets>({ height: 0, keyboard: 0, offsetTop: 0, bottom: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;

    const measure = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const shrink = viewport ? Math.max(0, window.innerHeight - height - offsetTop) : 0;
      const keyboard = shrink >= KEYBOARD_MIN_PX ? shrink : 0;
      const bottom = keyboard > 0 ? 0 : shrink;

      setState({ height, keyboard, offsetTop, bottom });
    };

    measure();
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);

    return () => {
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return state;
}
