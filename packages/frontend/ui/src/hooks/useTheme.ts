import { useCallback, useEffect, useState } from 'react';
import { THEMES, type ThemeName, type ThemeTokens } from '../styles/tokens';

const STORAGE_KEY = 'chat.theme';

/** Тема хранится локально у каждого устройства. */
export function useTheme(): { theme: ThemeTokens; name: ThemeName; setTheme: (name: ThemeName) => void } {
  const [name, setName] = useState<ThemeName>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // приватный режим или запрет на хранение — используем системную тему
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // не критично: тема просто не переживёт перезагрузку
    }
  }, [name]);

  const setTheme = useCallback((next: ThemeName) => setName(next), []);

  return { theme: THEMES[name], name, setTheme };
}
