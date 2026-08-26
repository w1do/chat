<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;

final class RoomPolicy
{
    /**
     * Публичная комната видна всем, приватная — участникам. Чужой диалог
     * не показывается даже отказом: для постороннего его не существует
     * (spec chat/direct-messages).
     */
    public function view(Authenticatable $user, Room $room): Response
    {
        if ($room->isPublic() || $room->hasMember($user)) {
            return Response::allow();
        }

        return $room->isDirect() ? Response::denyAsNotFound() : Response::deny();
    }

    /** Название и описание правят владелец и админ: ошибка в названии поправима. */
    public function update(Authenticatable $user, Room $room): bool
    {
        // У диалога нет названия и описания — править нечего. Вид проверяется
        // в политике, а не в контроллере: обход через API невозможен (design).
        if ($room->isDirect()) {
            return false;
        }

        return (bool) $room->roleOf($user)?->canManageRoom();
    }

    /** Архивирование обратимо, поэтому остаётся у владельца и админа. */
    public function archive(Authenticatable $user, Room $room): bool
    {
        // Личная переписка не архивируется: у неё есть только скрытие у себя.
        if ($room->isDirect()) {
            return false;
        }

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

        // Диалог подписан именем и аватаркой собеседника; своей фотографии
        // у него нет.
        if ($room->isDirect()) {
            return $role === null ? Response::denyAsNotFound() : Response::deny();
        }

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

        // Диалог не удаляется никем: переписка принадлежит обоим, у неё нет
        // владельца (spec chat/direct-messages).
        if ($room->isDirect()) {
            return $role === null ? Response::denyAsNotFound() : Response::deny();
        }

        if ($role === RoomRole::Owner) {
            return Response::allow();
        }

        return $role === null ? Response::denyAsNotFound() : Response::deny();
    }
}
