import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from '../src/components/Avatar';
import { Confetti } from '../src/components/Confetti';
import { Segmented } from '../src/components/Segmented';
import { Sheet } from '../src/components/Sheet';
import { Toggle } from '../src/components/Toggle';
import { LIGHT, voiceHue } from '../src/styles/tokens';

describe('Toggle', () => {
  it('exposes switch semantics and toggles', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} theme={LIGHT} label="Звук" />);

    const toggle = screen.getByRole('switch', { name: 'Звук' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Segmented', () => {
  it('marks the active option and switches with the keyboard', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        theme={LIGHT}
        label="Тема"
        value="light"
        options={[
          { id: 'light', label: 'Светлая' },
          { id: 'dark', label: 'Тёмная' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Светлая' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.keyboard('{Tab}{Tab}{Enter}');
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});

describe('Sheet', () => {
  it('closes on Escape and on the close button', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open title="Помощник" onClose={onClose} theme={LIGHT}>
        <p>Содержимое</p>
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Помощник' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(
      <Sheet open={false} title="Помощник" onClose={onClose} theme={LIGHT}>
        <p>Содержимое</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'false');
  });
});

describe('Avatar', () => {
  it('keeps one colour per user and marks presence', () => {
    render(<Avatar userId="u1" name="Alice" theme={LIGHT} online />);

    expect(screen.getByLabelText('в сети')).toBeInTheDocument();
    expect(voiceHue('u1')).toBe(voiceHue('u1'));
    expect(voiceHue('u1')).not.toBe(voiceHue('u2'));
  });
});

describe('Confetti', () => {
  it('greets a new participant and fades away on its own', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();

    render(
      <Confetti active message="К нам подключился Bob" theme={LIGHT} durationMs={1000} onDone={onDone} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('К нам подключился Bob');
    // Слой не перехватывает нажатия: интерфейс остаётся рабочим.
    expect(document.querySelector('.pointer-events-none')).not.toBeNull();
    expect(document.querySelectorAll('.confetti-piece').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onDone).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('drops the confetti when motion is reduced but keeps the notice', () => {
    render(<Confetti active reducedMotion message="К нам подключился Bob" theme={LIGHT} />);

    expect(screen.getByRole('status')).toHaveTextContent('К нам подключился Bob');
    expect(document.querySelectorAll('.confetti-piece')).toHaveLength(0);
  });
});

describe('Avatar', () => {
  it('рисует букву имени, пока картинки нет', () => {
    render(<Avatar userId="u1" name="Алиса" theme={LIGHT} />);

    expect(screen.getByText('А')).toBeInTheDocument();
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('показывает загруженную картинку вместо буквы', () => {
    const { container } = render(
      <Avatar userId="u1" name="Алиса" src="/api/v1/avatars/abc/thumb" theme={LIGHT} />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/api/v1/avatars/abc/thumb');
    expect(screen.queryByText('А')).not.toBeInTheDocument();
  });

  it('возвращается к букве, если картинка не загрузилась', () => {
    const { container } = render(
      <Avatar userId="u1" name="Алиса" src="/api/v1/avatars/broken" theme={LIGHT} />,
    );

    fireEvent.error(container.querySelector('img')!);

    expect(screen.getByText('А')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('пробует снова, когда адрес сменился', () => {
    const { container, rerender } = render(
      <Avatar userId="u1" name="Алиса" src="/api/v1/avatars/broken" theme={LIGHT} />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByText('А')).toBeInTheDocument();

    rerender(<Avatar userId="u1" name="Алиса" src="/api/v1/avatars/fresh" theme={LIGHT} />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/avatars/fresh');
  });
});
