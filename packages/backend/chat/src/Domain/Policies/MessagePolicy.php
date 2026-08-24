<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Policies;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

final class MessagePolicy
{
    public function viewAny(Authenticatable $user, Room $room): bool
    {
        return $room->isPublic() || $room->hasMember($user);
    }

    public function send(Authenticatable $user, Room $room): bool
    {
        return ! $room->isArchived() && $room->hasMember($user);
    }

    public function view(Authenticatable $user, Message $message): bool
    {
        $room = $message->room;

        return $room->isPublic() || $room->hasMember($user);
    }

    public function update(Authenticatable $user, Message $message): bool
    {
        if ($message->trashed() || ! $message->isAuthoredBy($user)) {
            return false;
        }

        return $message->isWithinEditWindow((int) config('chat.message.edit_window_minutes', 15));
    }

    public function delete(Authenticatable $user, Message $message): bool
    {
        if ($message->trashed()) {
            return false;
        }

        if ($message->isAuthoredBy($user)) {
            return true;
        }

        return (bool) $message->room->roleOf($user)?->canManageRoom();
    }

    public function react(Authenticatable $user, Message $message): bool
    {
        return ! $message->trashed() && $message->room->hasMember($user);
    }
}
