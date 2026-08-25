<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;

final class RoomPolicy
{
    public function view(Authenticatable $user, Room $room): bool
    {
        return $room->isPublic() || $room->hasMember($user);
    }

    /** Название и описание правят владелец и админ: ошибка в названии поправима. */
    public function update(Authenticatable $user, Room $room): bool
    {
        return (bool) $room->roleOf($user)?->canManageRoom();
    }

    /** Архивирование обратимо, поэтому остаётся у владельца и админа. */
    public function archive(Authenticatable $user, Room $room): bool
    {
        return (bool) $room->roleOf($user)?->canManageRoom();
    }

    /**
     * Фотография — то же оформление комнаты, что название и описание:
     * право совпадает, отдельного заводить незачем (design 4). Постороннему
     * приватная комната не показывается даже отказом.
     */
    public function changePhoto(Authenticatable $user, Room $room): Response
    {
        $role = $room->roleOf($user);

        if ($role?->canManageRoom()) {
            return Response::allow();
        }

        return $role === null && ! $room->isPublic() ? Response::denyAsNotFound() : Response::deny();
    }

    /**
     * Удаление необратимо: только владелец. Постороннему комната не показана
     * даже отказом — для него её просто нет.
     */
    public function delete(Authenticatable $user, Room $room): Response
    {
        $role = $room->roleOf($user);

        if ($role === RoomRole::Owner) {
            return Response::allow();
        }

        return $role === null ? Response::denyAsNotFound() : Response::deny();
    }
}
