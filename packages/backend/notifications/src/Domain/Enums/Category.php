<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Enums;

enum Category: string
{
    case Message = 'message';
    case Mention = 'mention';
    case RoomInvite = 'room_invite';
    /** Безопасность и администрирование: канал «в приложении» не отключается. */
    case Security = 'security';

    public function isMandatory(): bool
    {
        return $this === self::Security;
    }

    /** Очередь под категорию: срочное не стоит за рассылками (CLAUDE.md §10). */
    public function queue(): string
    {
        return match ($this) {
            self::Security => 'notifications-critical',
            self::Mention, self::RoomInvite => 'notifications',
            self::Message => 'notifications-bulk',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Message => 'Новые сообщения',
            self::Mention => 'Упоминания',
            self::RoomInvite => 'Приглашения в комнаты',
            self::Security => 'Безопасность',
        };
    }
}
