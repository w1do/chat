import { useEffect, useState } from 'react';

/**
 * Высота видимой области и высота экранной клавиатуры.
 * На мобильных visualViewport уменьшается при открытии клавиатуры —
 * панель ввода должна подниматься над ней, а лента прокручиваться вниз.
 */
export function useKeyboardInsets(): { height: number; keyboard: number } {
  const [state, setState] = useState({ height: 0, keyboard: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;

    const measure = () => {
      const height = viewport?.height ?? window.innerHeight;
      const keyboard = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      setState({ height, keyboard });
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
