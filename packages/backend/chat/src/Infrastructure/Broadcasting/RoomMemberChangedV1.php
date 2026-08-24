<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

final class RoomMemberChangedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'room.member_changed.v1';
    }
}
