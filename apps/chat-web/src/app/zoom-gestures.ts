/**
 * Щипок двумя пальцами не масштабирует приложение.
 *
 * `touch-action: pan-x pan-y` в стилях закрывает жест в Chrome на Android, но
 * Safari на iOS масштаб страницы по нему не сверяет: там о щипке сообщают
 * нестандартные события `gesture*`, и остаётся подавить их. Оба средства
 * нужны вместе — они закрывают разные браузеры, и ни одно не запасное.
 *
 * Двойной тап не подавляется намеренно: его уже отнял `touch-action`, а
 * гашение `touchend` заодно отменяло бы и обычное двойное нажатие по
 * сообщению — быструю реакцию.
 */
const ZOOM_GESTURES = ['gesturestart', 'gesturechange', 'gestureend'] as const;

/**
 * Ставит подавление на документ и возвращает функцию снятия.
 *
 * `passive: false` обязателен: у пассивного слушателя `preventDefault` не
 * работает, и жест прошёл бы насквозь.
 */
export function preventZoomGestures(): () => void {
  const stop = (event: Event) => event.preventDefault();

  for (const name of ZOOM_GESTURES) {
    document.addEventListener(name, stop, { passive: false });
  }

  return () => {
    for (const name of ZOOM_GESTURES) {
      document.removeEventListener(name, stop);
    }
  };
}
