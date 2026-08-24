<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;

final class RoomPolicy
{
    public function view(Authenticatable $user, Room $room): bool
    {
        return $room->isPublic() || $room->hasMember($user);
    }

    public function update(Authenticatable $user, Room $room): bool
    {
        return (bool) $room->roleOf($user)?->canManageRoom();
    }

    public function archive(Authenticatable $user, Room $room): bool
    {
        return $room->roleOf($user) === RoomRole::Owner;
    }
}
