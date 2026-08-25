<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class SelectAvatarCommand
{
    public function __construct(
        public string $userId,
        public string $avatarId,
    ) {}
}
