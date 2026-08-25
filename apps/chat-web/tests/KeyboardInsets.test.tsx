import { act, renderHook } from '@testing-library/react';
import { useKeyboardInsets } from '@vendor/ui';
import { beforeEach, describe, expect, it } from 'vitest';

/** Подменяем visualViewport: в jsdom его нет. */
function fakeViewport(height: number, offsetTop = 0) {
  const listeners = new Map<string, () => void>();

  const viewport = {
    height,
    offsetTop,
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
    emit: () => listeners.forEach((listener) => listener()),
    set: (next: { height?: number; offsetTop?: number }) => {
      if (next.height !== undefined) viewport.height = next.height;
      if (next.offsetTop !== undefined) viewport.offsetTop = next.offsetTop;
      viewport.emit();
    },
  };

  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true, writable: true });

  return viewport;
}

describe('useKeyboardInsets', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
  });

  it('сообщает высоту клавиатуры, когда она открылась', () => {
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    expect(result.current.keyboard).toBe(0);

    act(() => viewport.set({ height: 460 }));

    expect(result.current.height).toBe(460);
    expect(result.current.keyboard).toBe(340);
  });

  it('возвращает сдвиг вьюпорта, который делает браузер сам', () => {
    // iOS Safari при открытии клавиатуры прокручивает документ: без этого
    // числа шапка уезжает за верхний край.
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460, offsetTop: 120 }));

    expect(result.current.offsetTop).toBe(120);
    expect(result.current.keyboard).toBe(220);
  });

  it('не принимает панель браузера за клавиатуру', () => {
    // iOS: layout-вьюпорт выше визуального из-за адресной строки. Если считать
    // это клавиатурой, панель ввода теряет нижний безопасный отступ.
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 740 }));

    expect(result.current.keyboard).toBe(0);
    expect(result.current.height).toBe(740);
    // Именно эта полоса и прятала панель ввода: её надо отдать вёрстке.
    expect(result.current.bottom).toBe(60);
  });

  it('считает нижнюю полосу только когда клавиатура закрыта', () => {
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460 }));

    // Открытая клавиатура — не полоса браузера: панель прижимается к ней.
    expect(result.current.keyboard).toBe(340);
    expect(result.current.bottom).toBe(0);
  });

  it('без visualViewport ничего не выдумывает', () => {
    // Запасной путь — env(safe-area-inset-bottom) в CSS.
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true, writable: true });

    const { result } = renderHook(() => useKeyboardInsets());

    expect(result.current.height).toBe(800);
    expect(result.current.keyboard).toBe(0);
    expect(result.current.bottom).toBe(0);
    expect(result.current.offsetTop).toBe(0);
  });
});
