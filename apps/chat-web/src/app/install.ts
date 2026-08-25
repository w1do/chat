import { useEffect, useState } from 'react';
import { isStandalone } from './push';

/**
 * Предложение установить приложение. Браузер сам сообщает, что установка
 * возможна; подсказку показываем один раз и запоминаем ответ.
 */
const DISMISSED_KEY = 'chat:install-dismissed';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Приватный режим: подсказка просто появится ещё раз.
  }
}

export function useInstallPrompt(): { canInstall: boolean; install: () => Promise<void>; dismiss: () => void } {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => wasDismissed() || isStandalone());

  useEffect(() => {
    const onPrompt = (native: Event) => {
      // Откладываем стандартную плашку: предложим установку своим языком.
      native.preventDefault();
      setEvent(native as InstallPromptEvent);
    };

    const onInstalled = () => {
      setEvent(null);
      setHidden(true);
      remember();
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    canInstall: !hidden && event !== null,
    install: async () => {
      if (!event) return;

      await event.prompt();
      await event.userChoice;
      setEvent(null);
      setHidden(true);
      remember();
    },
    dismiss: () => {
      setHidden(true);
      remember();
    },
  };
}
