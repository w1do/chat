<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Queries;

final readonly class ListNotificationsQuery
{
    public function __construct(
        public string $userId,
        public bool $unreadOnly = false,
        public int $limit = 30,
    ) {}
}
