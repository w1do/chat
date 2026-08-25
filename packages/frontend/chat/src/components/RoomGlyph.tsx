import { roomEmoji, type ThemeTokens } from '@vendor/ui';
import { useEffect, useState } from 'react';

interface RoomGlyphProps {
  name: string;
  /** Фотография комнаты; её нет — рисуется эмодзи из названия. */
  photoUrl?: string | null;
  size: number;
  radius: number;
  theme: ThemeTokens;
}

/**
 * Значок комнаты: загруженная фотография, а пока её нет — эмодзи из названия.
 * Эмодзи остаётся запасным видом и при неудачной загрузке: пустых дыр в
 * списке переписок быть не должно.
 */
export function RoomGlyph({ name, photoUrl, size, radius, theme }: RoomGlyphProps) {
  const [failed, setFailed] = useState(false);

  // Новый адрес — новая попытка: прежняя неудача не должна прятать только
  // что поставленную фотографию.
  useEffect(() => setFailed(false), [photoUrl]);

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius, background: theme.surfaceAlt }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: theme.surfaceAlt,
        fontSize: Math.round(size * 0.46),
      }}
    >
      {roomEmoji(name)}
    </span>
  );
}
