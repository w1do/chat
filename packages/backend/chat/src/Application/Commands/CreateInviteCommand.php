<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class CreateInviteCommand
{
    public function __construct(
        public string $roomId,
        public string $userId,
    ) {}
}
