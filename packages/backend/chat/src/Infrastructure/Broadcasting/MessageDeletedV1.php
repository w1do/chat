<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

final class MessageDeletedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'message.deleted.v1';
    }
}
