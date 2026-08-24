import { useCallback, useEffect, useState } from 'react';
import type { TextSize, ThemeName } from '@vendor/ui';

/**
 * Настройки интерфейса. Хранятся локально на устройстве: серверу они не нужны,
 * а приватный режим просто вернёт значения по умолчанию.
 */
export interface AppSettings {
  theme: ThemeName;
  animations: boolean;
  textSize: TextSize;
  showTyping: boolean;
  sendOnEnter: boolean;
}

const STORAGE_KEY = 'chat.settings';

function systemDefaults(): AppSettings {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  return {
    theme: prefersDark ? 'dark' : 'light',
    animations: !prefersReduced,
    textSize: 'M',
    showTyping: true,
    sendOnEnter: true,
  };
}

export function useSettings(): {
  settings: AppSettings;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
} {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaults = systemDefaults();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      return stored ? { ...defaults, ...(JSON.parse(stored) as Partial<AppSettings>) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // не критично: настройки не переживут перезагрузку
    }
  }, [settings]);

  const set = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  return { settings, set };
}
