import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';

/** Подменяем matchMedia: в jsdom он не следит за шириной окна. */
function matchMedia(initial: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const list = {
    matches: initial,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  };

  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue(list),
    configurable: true,
    writable: true,
  });

  return {
    resizeTo: (matches: boolean) => {
      list.matches = matches;
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
}

describe('useMediaQuery', () => {
  it('сообщает текущее состояние и следит за изменением ширины', () => {
    const media = matchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);

    act(() => media.resizeTo(true));
    expect(result.current).toBe(true);

    act(() => media.resizeTo(false));
    expect(result.current).toBe(false);
  });
});
