import { ONLINE, voiceHue, type ThemeTokens } from '../styles/tokens';
import { AuthorizedImage } from './AuthorizedImage';

interface AvatarProps {
  /** Идентификатор задаёт постоянный оттенок голоса. */
  userId: string;
  name: string;
  /** Адрес картинки; её нет — рисуется буква с оттенком. */
  src?: string | null;
  size?: number;
  theme: ThemeTokens;
  online?: boolean;
}

/**
 * Аватар участника: загруженная картинка, а пока её нет — эмодзи-заглушка из
 * имени с личным оттенком. Буква остаётся запасным видом и тогда, когда
 * картинка не загрузилась: пустых дыр в интерфейсе быть не должно.
 */
export function Avatar({ userId, name, src, size = 44, theme, online }: AvatarProps) {
  const hue = voiceHue(userId);
  const initial = name.trim().charAt(0).toUpperCase() || '·';

  const letter = (
    <span
      aria-hidden="true"
      className="flex items-center justify-center w-full h-full font-semibold"
      style={{
        borderRadius: size * 0.36,
        background: `${hue}1F`,
        boxShadow: `inset 0 0 0 1.5px ${hue}44`,
        color: hue,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </span>
  );

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <AuthorizedImage
        src={src}
        fallback={letter}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        decoding="async"
        className="w-full h-full object-cover"
        style={{ borderRadius: size * 0.36, background: `${hue}1F` }}
      />
      {online ? (
        <span
          aria-label="в сети"
          role="img"
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 12,
            height: 12,
            borderRadius: 6,
            background: ONLINE,
            boxShadow: `0 0 0 2.5px ${theme.bg}`,
          }}
        />
      ) : null}
    </span>
  );
}
