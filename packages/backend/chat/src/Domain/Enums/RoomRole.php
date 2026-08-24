<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Enums;

enum RoomRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Member = 'member';

    public function canManageRoom(): bool
    {
        return $this === self::Owner || $this === self::Admin;
    }
}
