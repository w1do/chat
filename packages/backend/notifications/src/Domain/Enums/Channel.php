<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Enums;

enum Channel: string
{
    /** Лента внутри приложения; для обязательных категорий не отключается. */
    case Database = 'database';
    case Mail = 'mail';
    /** Системное уведомление на устройство; работает и при закрытом чате. */
    case Push = 'push';

    public function label(): string
    {
        return match ($this) {
            self::Database => 'В приложении',
            self::Mail => 'На почту',
            self::Push => 'На устройство',
        };
    }
}
