import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver и scrollTo — экраны измеряют шапку.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo ??= function scrollTo(): void {};

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
