import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver и scrollTo — экраны измеряют шапку.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollTo ??= function scrollTo(): void {};
