<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class JoinRoomCommand
{
    public function __construct(
        public string $roomId,
        public string $userId,
    ) {}
}
