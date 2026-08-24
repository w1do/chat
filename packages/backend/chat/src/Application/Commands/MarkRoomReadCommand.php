<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class MarkRoomReadCommand
{
    public function __construct(
        public string $roomId,
        public string $userId,
        public string $lastReadMessageId,
    ) {}
}
