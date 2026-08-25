<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

final class MembershipPolicy
{
    public function viewMembers(Authenticatable $user, Room $room): bool
    {
        return $room->isPublic() || $room->hasMember($user);
    }

    public function invite(Authenticatable $user, Room $room): bool
    {
        return (bool) $room->roleOf($user)?->canManageRoom();
    }

    public function join(Authenticatable $user, Room $room): bool
    {
        return $room->isPublic() && ! $room->isArchived() && ! $room->hasMember($user);
    }

    public function leave(Authenticatable $user, Room $room): bool
    {
        $role = $room->roleOf($user);

        // Owner не может покинуть комнату, не передав владение.
        return $role !== null && $role !== RoomRole::Owner;
    }

    /**
     * Убрать из комнаты чужую запись участия. Владелец распоряжается составом
     * целиком, админ помогает с обычными участниками. Постороннему комната не
     * показана даже отказом — для него её просто нет.
     */
    public function remove(Authenticatable $user, Room $room, RoomMember $target): Response
    {
        $role = $room->roleOf($user);

        if ($role === null) {
            return Response::denyAsNotFound();
        }

        // Себя не исключают: для этого есть выход, а владелец без передачи
        // владения не уходит вовсе — иначе комната останется без владельца.
        if ($target->user_id === (string) $user->getAuthIdentifier()) {
            return Response::deny();
        }

        return match ($role) {
            RoomRole::Owner => Response::allow(),
            RoomRole::Admin => $target->role === RoomRole::Member ? Response::allow() : Response::deny(),
            RoomRole::Member => Response::deny(),
        };
    }

    public function changeRole(Authenticatable $user, Room $room, RoomMember $target): bool
    {
        if ($room->roleOf($user) !== RoomRole::Owner) {
            return false;
        }

        // Роль владельца не меняется этим действием (передача владения — отдельная операция).
        return $target->role !== RoomRole::Owner;
    }
}
