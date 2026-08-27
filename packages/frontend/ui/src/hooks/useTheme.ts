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

  useEffect(() => {
    // Оболочка стоит `position: fixed` поверх страницы: если её высота почему-
    // либо меньше окна, снизу виден документ. Красим его цветом темы, чтобы
    // там был фон приложения, а не посторонняя серая полоса. Само правило —
    // `background: var(--app-bg)` в стилях приложения.
    document.documentElement.style.setProperty('--app-bg', THEMES[name].bg);
  }, [name]);

  const setTheme = useCallback((next: ThemeName) => setName(next), []);

  return { theme: THEMES[name], name, setTheme };
}
