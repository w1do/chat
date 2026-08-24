import { useEffect, useMemo, useState } from 'react';
import type { ThemeTokens } from '../styles/tokens';

interface ConfettiProps {
  /** Пока true — приветствие видно; дальше оно гаснет само. */
  active: boolean;
  message: string;
  theme: ThemeTokens;
  /** Выключает движение: настройка «анимации» или системный reduced-motion. */
  reducedMotion?: boolean;
  durationMs?: number;
  onDone?: () => void;
}

const COLORS = ['#E0900E', '#6C63C9', '#2F8F7A', '#C75C8A', '#DD8A3C', '#3F7BC4'];

/**
 * Приветствие нового участника: конфетти на весь экран и надпись по центру,
 * которая плавно исчезает. Слой не перехватывает нажатия.
 */
export function Confetti({ active, message, theme, reducedMotion = false, durationMs = 3200, onDone }: ConfettiProps) {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) return;

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [active, durationMs, onDone]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: (index * 37) % 100,
        delay: (index % 12) * 0.09,
        duration: 2.1 + ((index % 7) * 0.18),
        color: COLORS[index % COLORS.length]!,
        size: 6 + (index % 4) * 2,
      })),
    [],
  );

  if (!active && !visible) return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity .6s ease' }}
    >
      {!reducedMotion
        ? pieces.map((piece) => (
            <span
              key={piece.id}
              aria-hidden="true"
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.size * 1.6,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))
        : null}

      <div className="absolute inset-0 grid place-items-center px-8">
        <p
          role="status"
          aria-live="polite"
          className="text-center px-4 py-3 text-[17px] font-semibold"
          style={{
            background: theme.surface,
            color: theme.text,
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(20,19,26,.22)',
            maxWidth: 320,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
