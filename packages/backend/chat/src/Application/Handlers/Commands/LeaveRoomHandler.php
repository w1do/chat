<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\LeaveRoomCommand;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class LeaveRoomHandler
{
    public function handle(LeaveRoomCommand $command): void
    {
        RoomMember::query()
            ->where('room_id', $command->roomId)
            ->where('user_id', $command->userId)
            ->delete();
    }
}
