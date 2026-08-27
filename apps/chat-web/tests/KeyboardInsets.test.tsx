import { act, render, renderHook } from '@testing-library/react';
import { useKeyboardInsets, type KeyboardInsets } from '@vendor/ui';
import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Подменяем visualViewport: в jsdom его нет. */
function fakeViewport(height: number, offsetTop = 0, scale?: number) {
  const listeners = new Map<string, () => void>();

  const viewport = {
    height,
    offsetTop,
    scale,
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
    emit: () => listeners.forEach((listener) => listener()),
    /** Молча меняет числа: браузер о них не сообщил — так стареет геометрия. */
    stale: (next: { height?: number; offsetTop?: number; scale?: number }) => {
      if (next.height !== undefined) viewport.height = next.height;
      if (next.offsetTop !== undefined) viewport.offsetTop = next.offsetTop;
      if (next.scale !== undefined) viewport.scale = next.scale;
    },
    set: (next: { height?: number; offsetTop?: number; scale?: number }) => {
      viewport.stale(next);
      viewport.emit();
    },
  };

  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true, writable: true });

  return viewport;
}

let consumerRenders = 0;

/**
 * Потребитель геометрии. Считаем рендеры именно на нём: сам хук React вправе
 * перерисовать лишний раз, отказываясь от обновления, а вот потребитель
 * перерисовывается ровно тогда, когда числа действительно изменились.
 */
const Consumer = memo(function Consumer(_props: { insets: KeyboardInsets }) {
  consumerRenders += 1;

  return null;
});

function Harness() {
  return <Consumer insets={useKeyboardInsets()} />;
}

/** Возврат из фона: страница снова видима. */
function resume(kind: 'visibilitychange' | 'pageshow' | 'focus'): void {
  if (kind === 'visibilitychange') {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    return;
  }

  window.dispatchEvent(new Event(kind));
}

describe('useKeyboardInsets', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    // Полоса браузера отдельным числом не нужна: оболочка уже занимает ровно
    // видимую область, и вторая поправка на ту же полосу давала бы пустоту.
    expect(result.current.height).toBe(740);
  });

  it('без visualViewport ничего не выдумывает', () => {
    // Запасной путь — env(safe-area-inset-bottom) в CSS.
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true, writable: true });

    const { result } = renderHook(() => useKeyboardInsets());

    expect(result.current.height).toBe(800);
    expect(result.current.keyboard).toBe(0);
    expect(result.current.offsetTop).toBe(0);
  });

  it('без scale в visualViewport ведёт себя как раньше', () => {
    // Браузер без масштаба во вьюпорте: считаем страницу неувеличенной и
    // меряем клавиатуру прежним способом, а не выдумываем масштаб.
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460, offsetTop: 40 }));

    expect(result.current.keyboard).toBe(300);
    expect(result.current.offsetTop).toBe(40);
  });

  it('не принимает увеличенную страницу за клавиатуру', () => {
    // Щипок уменьшает видимую область ровно так же, как клавиатура: без
    // проверки масштаба панель ввода всплывала бы к середине экрана.
    const viewport = fakeViewport(800, 0, 1);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 400, scale: 2 }));

    expect(result.current.keyboard).toBe(0);
    // Видимая область увеличенной страницы — окошко по layout-вьюпорту, а
    // оболочка меряется именно им: иначе под ней открылась бы пустота.
    expect(result.current.height).toBe(800);
  });

  it('под увеличенной страницей не оставляет пустоты', () => {
    const viewport = fakeViewport(800, 0, 1);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 260, offsetTop: 400, scale: 3 }));

    expect(result.current.height).toBe(800);
    expect(result.current.offsetTop).toBe(0);
  });

  it('при открытой клавиатуре сжатие сохраняется', () => {
    // Ограничитель применяется только к увеличенной странице: законное
    // сжатие под клавиатуру он снимать не должен.
    const viewport = fakeViewport(800, 0, 1);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460 }));

    expect(result.current.height).toBe(460);
    expect(result.current.keyboard).toBe(340);
  });

  it('не сдвигается вслед за увеличенной страницей', () => {
    // Человек двигает увеличенную страницу пальцем — вьюпорт получает сдвиг,
    // но раскладка приложения от этого перекашиваться не должна.
    const viewport = fakeViewport(800, 0, 1);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 400, offsetTop: 180, scale: 2 }));

    expect(result.current.offsetTop).toBe(0);
    expect(result.current.keyboard).toBe(0);
  });

  it('возвращается к обычному счёту, когда масштаб вернулся к единице', () => {
    const viewport = fakeViewport(800, 0, 1);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 400, offsetTop: 180, scale: 2 }));
    // Дробный масштаб от браузера — сравнение с допуском, а не строгое.
    act(() => viewport.set({ height: 460, offsetTop: 0, scale: 1.0000001 }));

    expect(result.current.height).toBe(460);
    expect(result.current.keyboard).toBe(340);
  });

  it('перемеряет геометрию после возврата из фона', () => {
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    // Клавиатуру закрыли, пока приложение было свёрнуто: событий об этом
    // браузер не прислал, и на экране остались числа, снятые до сворачивания.
    act(() => viewport.set({ height: 460, offsetTop: 120 }));
    viewport.stale({ height: 800, offsetTop: 0 });

    expect(result.current.keyboard).toBe(220);

    act(() => resume('visibilitychange'));

    expect(result.current.height).toBe(800);
    expect(result.current.keyboard).toBe(0);
    expect(result.current.offsetTop).toBe(0);
  });

  it.each(['pageshow', 'focus'] as const)('перемеряет геометрию по событию %s', (kind) => {
    // Восстановление из кеша навигации даёт pageshow; открытие по
    // уведомлению на iPhone может дать только focus.
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460 }));
    viewport.stale({ height: 800 });

    act(() => resume(kind));

    expect(result.current.keyboard).toBe(0);
    expect(result.current.height).toBe(800);
  });

  it('не перемеряет, пока страница ушла в фон', () => {
    const viewport = fakeViewport(800);
    const { result } = renderHook(() => useKeyboardInsets());

    act(() => viewport.set({ height: 460 }));
    viewport.stale({ height: 800 });

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.height).toBe(460);
  });

  it('не вызывает лишний рендер, когда числа не изменились', () => {
    const viewport = fakeViewport(800);
    consumerRenders = 0;

    render(<Harness />);

    const before = consumerRenders;

    act(() => viewport.emit());
    act(() => resume('focus'));

    expect(consumerRenders).toBe(before);
  });

  it('после возврата побеждает последнее измерение серии', () => {
    vi.useFakeTimers();
    const viewport = fakeViewport(800);
    consumerRenders = 0;

    const { result } = renderHook(() => useKeyboardInsets());
    render(<Harness />);

    act(() => viewport.set({ height: 460, offsetTop: 120 }));

    // Возврат по уведомлению: браузер ещё убирает клавиатуру и двигает
    // системные панели, поэтому ранние числа промежуточные.
    act(() => resume('focus'));

    viewport.stale({ height: 620, offsetTop: 60 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.height).toBe(620);

    viewport.stale({ height: 800, offsetTop: 0 });
    const before = consumerRenders;
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.height).toBe(800);
    expect(result.current.keyboard).toBe(0);
    // Серия перемеров — не серия рендеров: устоявшаяся геометрия даёт один.
    expect(consumerRenders - before).toBe(1);
  });

  it('снимает все слушатели при размонтировании', () => {
    const viewport = fakeViewport(800);
    const documentRemove = vi.spyOn(document, 'removeEventListener');
    const windowRemove = vi.spyOn(window, 'removeEventListener');
    const viewportRemove = vi.spyOn(viewport, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardInsets());

    unmount();

    for (const type of ['resize', 'scroll']) {
      expect(viewportRemove.mock.calls.some(([name]) => name === type), `вьюпорт: ${type}`).toBe(true);
    }
    for (const type of ['resize', 'pageshow', 'focus']) {
      expect(windowRemove.mock.calls.some(([name]) => name === type), `окно: ${type}`).toBe(true);
    }
    expect(documentRemove.mock.calls.some(([name]) => name === 'visibilitychange')).toBe(true);

    documentRemove.mockRestore();
    windowRemove.mockRestore();
  });

  it('не меряет после размонтирования', () => {
    vi.useFakeTimers();
    const viewport = fakeViewport(800);
    consumerRenders = 0;

    const { unmount } = render(<Harness />);

    act(() => resume('focus'));
    unmount();
    viewport.stale({ height: 460 });

    const before = consumerRenders;
    act(() => vi.advanceTimersByTime(2000));

    expect(consumerRenders).toBe(before);
  });
});
