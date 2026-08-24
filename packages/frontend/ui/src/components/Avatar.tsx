import { voiceHue, type ThemeTokens } from '../styles/tokens';

interface AvatarProps {
  /** Идентификатор задаёт постоянный оттенок голоса. */
  userId: string;
  name: string;
  size?: number;
  theme: ThemeTokens;
  online?: boolean;
}

/** Аватар участника: эмодзи-заглушка из имени + личный оттенок. */
export function Avatar({ userId, name, size = 44, theme, online }: AvatarProps) {
  const hue = voiceHue(userId);
  const initial = name.trim().charAt(0).toUpperCase() || '·';

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
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
            background: '#35C08A',
            boxShadow: `0 0 0 2.5px ${theme.bg}`,
          }}
        />
      ) : null}
    </span>
  );
}
