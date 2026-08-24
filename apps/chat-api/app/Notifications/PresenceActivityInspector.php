<?php

declare(strict_types=1);

namespace App\Notifications;

use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Notifications\Domain\Contracts\ActivityInspector;

/**
 * Мост между пакетами: «активен в комнате» берётся из presence-реестра chat.
 * Пакеты друг о друге не знают — связку делает приложение (STRUCTURE.md §9).
 */
final readonly class PresenceActivityInspector implements ActivityInspector
{
    public function __construct(private PresenceRegistry $presence) {}

    public function isActiveIn(string $roomId, string $userId): bool
    {
        return $this->presence->isActiveInRoom($roomId, $userId);
    }
}
