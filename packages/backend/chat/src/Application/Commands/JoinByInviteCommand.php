<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class JoinByInviteCommand
{
    public function __construct(
        public string $token,
        public string $userId,
    ) {}
}
