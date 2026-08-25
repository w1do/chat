import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/app/push', () => ({ isStandalone: () => false }));

import { useInstallPrompt } from '../src/app/install';

/** Событие браузера «приложение можно установить». */
function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn> } {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });

  act(() => {
    window.dispatchEvent(event);
  });

  return { prompt };
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('молчит, пока браузер не сказал, что установка возможна', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);
  });

  it('предлагает установку и запоминает согласие', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const { prompt } = fireBeforeInstallPrompt();

    await waitFor(() => expect(result.current.canInstall).toBe(true));

    await act(() => result.current.install());

    expect(prompt).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(false);

    // Второй раз не предлагаем — ответ сохранён.
    const second = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();
    expect(second.result.current.canInstall).toBe(false);
  });

  it('не возвращается после отказа', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.canInstall).toBe(false);

    const second = renderHook(() => useInstallPrompt());
    fireBeforeInstallPrompt();
    expect(second.result.current.canInstall).toBe(false);
  });
});
