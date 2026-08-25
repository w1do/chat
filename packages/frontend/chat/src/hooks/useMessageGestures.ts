import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Жесты над сообщением: свайп влево — ответить, двойное касание — быстрая
 * реакция, долгое нажатие — меню действий. Pointer Events вместо Touch
 * Events: один и тот же код обслуживает палец, мышь и стилус, поэтому на
 * компьютере те же действия доступны правым и двойным кликом.
 */

/** Смещение, после которого свайп засчитывается как ответ. */
export const SWIPE_THRESHOLD_PX = 56;
/** Отклонение по вертикали, после которого жест уступает прокрутке. */
export const SWIPE_CANCEL_PX = 24;
/** Удержание без движения, открывающее меню действий. */
export const LONG_PRESS_MS = 450;
/** Допуск смещения, при котором нажатие всё ещё считается долгим. */
export const LONG_PRESS_SLOP_PX = 10;
/** Окно между касаниями, в котором они считаются двойным. */
export const DOUBLE_TAP_MS = 300;
/** Допуск смещения между двумя касаниями. */
export const DOUBLE_TAP_SLOP_PX = 24;

interface GestureHandlers {
  onReply: () => void;
  onQuickReaction: () => void;
  onOpenActions: () => void;
  /** Жесты не применяются к удалённым сообщениям. */
  disabled?: boolean;
  /** Смещение пузыря во время свайпа — для подсказки «отпустите, чтобы ответить». */
  onSwipeProgress?: (offset: number) => void;
}

interface GestureBindings {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
}

export function useMessageGestures({
  onReply,
  onQuickReaction,
  onOpenActions,
  disabled = false,
  onSwipeProgress,
}: GestureHandlers): GestureBindings {
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPress = useRef<number | null>(null);
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  // Меню уже открыто этим же нажатием — отпускание не должно считаться касанием.
  const consumed = useRef(false);

  const clearLongPress = () => {
    if (longPress.current !== null) {
      window.clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  const reset = () => {
    clearLongPress();
    start.current = null;
    onSwipeProgress?.(0);
  };

  return {
    onPointerDown: (event) => {
      if (disabled) return;
      // Правая кнопка обрабатывается контекстным меню, а не как нажатие.
      if (event.button === 2) return;

      consumed.current = false;
      start.current = { x: event.clientX, y: event.clientY, time: Date.now() };

      clearLongPress();
      longPress.current = window.setTimeout(() => {
        consumed.current = true;
        start.current = null;
        onSwipeProgress?.(0);
        onOpenActions();
      }, LONG_PRESS_MS);
    },

    onPointerMove: (event) => {
      const origin = start.current;
      if (disabled || origin === null) return;

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;

      if (Math.abs(dx) > LONG_PRESS_SLOP_PX || Math.abs(dy) > LONG_PRESS_SLOP_PX) {
        clearLongPress();
      }

      // Вертикальное движение отдаём прокрутке ленты.
      if (Math.abs(dy) > SWIPE_CANCEL_PX) {
        reset();

        return;
      }

      // Тянем только влево и только когда горизонталь преобладает.
      if (dx < 0 && Math.abs(dx) > Math.abs(dy)) {
        onSwipeProgress?.(Math.max(dx, -(SWIPE_THRESHOLD_PX + 24)));
      }
    },

    onPointerUp: (event) => {
      const origin = start.current;
      clearLongPress();

      if (disabled || consumed.current || origin === null) {
        reset();

        return;
      }

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      onSwipeProgress?.(0);
      start.current = null;

      if (dx <= -SWIPE_THRESHOLD_PX && Math.abs(dy) <= SWIPE_CANCEL_PX) {
        lastTap.current = null;
        onReply();

        return;
      }

      // Смещение больше допуска — это не касание, а незавершённый жест.
      if (Math.abs(dx) > DOUBLE_TAP_SLOP_PX || Math.abs(dy) > DOUBLE_TAP_SLOP_PX) {
        lastTap.current = null;

        return;
      }

      const now = Date.now();
      const previous = lastTap.current;

      if (
        previous !== null &&
        now - previous.time <= DOUBLE_TAP_MS &&
        Math.abs(event.clientX - previous.x) <= DOUBLE_TAP_SLOP_PX &&
        Math.abs(event.clientY - previous.y) <= DOUBLE_TAP_SLOP_PX
      ) {
        lastTap.current = null;
        onQuickReaction();

        return;
      }

      lastTap.current = { x: event.clientX, y: event.clientY, time: now };
    },

    onPointerCancel: reset,

    onContextMenu: (event) => {
      if (disabled) return;

      // Своё меню вместо стандартного меню браузера.
      event.preventDefault();
      clearLongPress();
      consumed.current = true;
      onOpenActions();
    },
  };
}
