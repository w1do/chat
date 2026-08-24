<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Vendor\Chat\Application\Commands\LeaveRoomCommand;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class LeaveRoomHandler
{
    public function __construct(private Dispatcher $events) {}

    public function handle(LeaveRoomCommand $command): void
    {
        $deleted = RoomMember::query()
            ->where('room_id', $command->roomId)
            ->where('user_id', $command->userId)
            ->delete();

        if ($deleted > 0) {
            $this->events->dispatch(new RoomMemberChanged($command->roomId, $command->userId, 'left', null));
        }
    }
}
