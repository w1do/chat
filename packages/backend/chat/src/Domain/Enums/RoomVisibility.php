<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Enums;

enum RoomVisibility: string
{
    case PublicRoom = 'public';
    case PrivateRoom = 'private';
}
