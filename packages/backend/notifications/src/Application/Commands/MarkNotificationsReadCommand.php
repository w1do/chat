<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Commands;

final readonly class MarkNotificationsReadCommand
{
    /** @param ?list<string> $ids null отмечает всё прочитанным */
    public function __construct(
        public string $userId,
        public ?array $ids = null,
    ) {}
}
