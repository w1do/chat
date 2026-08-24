import type { ThemeTokens } from '@vendor/ui';
import type { Message } from '../../schemas/message';

/** Текст системной записи формулирует клиент из payload (design 1c). */
export function systemText(message: Message, actorName: string): string {
  switch (message.payload?.event) {
    case 'member.joined':
      return `${actorName} присоединился к комнате`;
    case 'member.invited':
      return `${actorName} добавлен в комнату`;
    case 'member.left':
      return `${actorName} покинул комнату`;
    default:
      return 'Событие комнаты';
  }
}

export function SystemEntry({
  message,
  actorName,
  theme,
}: {
  message: Message;
  actorName: string;
  theme: ThemeTokens;
}) {
  return (
    <div className="flex justify-center py-1.5">
      <p
        aria-label={`Событие комнаты ${message.id}`}
        className="text-[12.5px] px-3 py-1 text-center"
        style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: 9 }}
      >
        {systemText(message, actorName)}
      </p>
    </div>
  );
}
