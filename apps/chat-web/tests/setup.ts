import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver и scrollTo — экраны измеряют шапку.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo ??= function scrollTo(): void {};

// jsdom не реализует PointerEvent — без него у события нет координат, и жесты
// сообщения (двойное касание, свайп) не проверить. Наследуем от MouseEvent: он
// несёт clientX/clientY и button. Тот же приём в тестах @vendor/chat.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'touch';
    }
  }

  window.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

// В этой сборке jsdom не отдаёт localStorage — им пользуются подсказки
// (установка приложения) и локальные настройки.
if (typeof window.localStorage === 'undefined') {
  const store = new Map<string, string>();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}
