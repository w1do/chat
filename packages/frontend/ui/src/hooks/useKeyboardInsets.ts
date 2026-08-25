import { useEffect, useState } from 'react';

/**
 * Геометрия видимой области: её высота, высота экранной клавиатуры и сдвиг
 * вьюпорта. Сдвиг нужен отдельно: iOS Safari при открытии клавиатуры сам
 * прокручивает документ, и без компенсации шапка уезжает за верхний край.
 */
export function useKeyboardInsets(): { height: number; keyboard: number; offsetTop: number } {
  const [state, setState] = useState({ height: 0, keyboard: 0, offsetTop: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;

    const measure = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const keyboard = Math.max(0, window.innerHeight - height - offsetTop);

      setState({ height, keyboard, offsetTop });
    };

    measure();
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);

    return () => {
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return state;
}
