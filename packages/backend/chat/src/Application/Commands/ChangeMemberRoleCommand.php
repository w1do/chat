<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class ChangeMemberRoleCommand
{
    public function __construct(
        public string $roomId,
        public string $memberId,
        public string $role,
    ) {}
}
