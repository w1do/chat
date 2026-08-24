<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Presence;

use Vendor\Notifications\Domain\Contracts\ActivityInspector;

/**
 * Безопасное значение по умолчанию: без знания о присутствии считаем, что
 * получателя в комнате нет — уведомление лучше показать, чем потерять.
 */
final readonly class AlwaysInactiveInspector implements ActivityInspector
{
    public function isActiveIn(string $roomId, string $userId): bool
    {
        return false;
    }
}
