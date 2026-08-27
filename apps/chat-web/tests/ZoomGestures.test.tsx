import { fireEvent, render, screen } from '@testing-library/react';
import { useMessageGestures } from '@vendor/chat';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preventZoomGestures } from '../src/app/zoom-gestures';

const GESTURES = ['gesturestart', 'gesturechange', 'gestureend'] as const;

let dispose: (() => void) | null = null;

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.restoreAllMocks();
});

/** Пузырь сообщения с настоящими жестами ленты. */
function Bubble({ onQuickReaction }: { onQuickReaction: () => void }) {
  const gestures = useMessageGestures({
    onReply: () => {},
    onQuickReaction,
    onOpenActions: () => {},
  });

  return (
    <article aria-label="Сообщение" {...gestures}>
      Привет
    </article>
  );
}

/** Касание пальцем: жесты сообщения слушают Pointer Events. */
function tap(element: HTMLElement): void {
  fireEvent.pointerDown(element, { clientX: 40, clientY: 40, button: 0 });
  fireEvent.pointerUp(element, { clientX: 40, clientY: 40, button: 0 });
}

describe('подавление жестового масштабирования', () => {
  it('ставит слушатели щипка на документ и снимает их', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');

    const stop = preventZoomGestures();

    for (const name of GESTURES) {
      const call = add.mock.calls.find(([type]) => type === name);
      expect(call, `нет слушателя ${name}`).toBeDefined();
      // Пассивный слушатель не умеет отменять жест — щипок прошёл бы насквозь.
      expect(call![2]).toMatchObject({ passive: false });
    }

    stop();

    for (const name of GESTURES) {
      expect(remove.mock.calls.some(([type]) => type === name), `слушатель ${name} остался`).toBe(true);
    }
  });

  it('отменяет щипок Safari', () => {
    dispose = preventZoomGestures();

    for (const name of GESTURES) {
      // jsdom не знает gesture-события: подделываем обычным Event.
      const event = new Event(name, { bubbles: true, cancelable: true });
      document.dispatchEvent(event);

      expect(event.defaultPrevented, `${name} не отменён`).toBe(true);
    }
  });

  it('не мешает двойному нажатию по сообщению', () => {
    // Гашение `touchend` ради двойного тапа отменяло бы заодно и быструю
    // реакцию: жест сообщения так и не доходил бы до приложения.
    dispose = preventZoomGestures();

    const onQuickReaction = vi.fn();
    render(<Bubble onQuickReaction={onQuickReaction} />);
    const bubble = screen.getByRole('article', { name: 'Сообщение' });

    tap(bubble);
    tap(bubble);

    expect(onQuickReaction).toHaveBeenCalledTimes(1);
  });
});
