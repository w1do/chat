<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

final class MessagePolicy
{
    /** История диалога для постороннего не существует — как и сам диалог. */
    public function viewAny(Authenticatable $user, Room $room): Response
    {
        if ($room->isPublic() || $room->hasMember($user)) {
            return Response::allow();
        }

        return $room->isDirect() ? Response::denyAsNotFound() : Response::deny();
    }

    public function send(Authenticatable $user, Room $room): bool
    {
        return ! $room->isArchived() && $room->hasMember($user);
    }

    public function view(Authenticatable $user, Message $message): Response
    {
        $room = $message->room;

        if ($room->isPublic() || $room->hasMember($user)) {
            return Response::allow();
        }

        return $room->isDirect() ? Response::denyAsNotFound() : Response::deny();
    }

    public function update(Authenticatable $user, Message $message): bool
    {
        // Системные записи принадлежат истории комнаты, а не автору (design 1c).
        if ($message->isSystem()) {
            return false;
        }

        if ($message->trashed() || ! $message->isAuthoredBy($user)) {
            return false;
        }

        return $message->isWithinEditWindow((int) config('chat.message.edit_window_minutes', 15));
    }

    public function delete(Authenticatable $user, Message $message): bool
    {
        if ($message->isSystem() || $message->trashed()) {
            return false;
        }

        if ($message->isAuthoredBy($user)) {
            return true;
        }

        return (bool) $message->room->roleOf($user)?->canManageRoom();
    }

    public function react(Authenticatable $user, Message $message): bool
    {
        return ! $message->isSystem() && ! $message->trashed() && $message->room->hasMember($user);
    }
}
