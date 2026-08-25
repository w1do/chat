<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

final class RoomDeletedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'room.deleted.v1';
    }
}
