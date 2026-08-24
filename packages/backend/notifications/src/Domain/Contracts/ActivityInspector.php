<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Contracts;

/**
 * «Активен ли получатель в комнате прямо сейчас». Реализацию подставляет
 * приложение (chat: Redis presence registry) — пакеты не знают друг о друге.
 */
interface ActivityInspector
{
    public function isActiveIn(string $roomId, string $userId): bool;
}
