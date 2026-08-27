import { useEffect, useState } from 'react';
import { ONLINE, voiceHue, type ThemeTokens } from '../styles/tokens';

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
  const [failed, setFailed] = useState(false);

  // Новый адрес — новая попытка: прежняя неудача не должна прятать картинку,
  // которую человек только что поставил.
  useEffect(() => setFailed(false), [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          style={{ borderRadius: size * 0.36, background: `${hue}1F` }}
        />
      ) : (
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
      )}
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
