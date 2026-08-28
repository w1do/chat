import { AuthorizedImage, roomEmoji, type ThemeTokens } from '@vendor/ui';

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
  const emoji = (
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

  return (
    <AuthorizedImage
      src={photoUrl}
      fallback={emoji}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: radius, background: theme.surfaceAlt }}
    />
  );
}
