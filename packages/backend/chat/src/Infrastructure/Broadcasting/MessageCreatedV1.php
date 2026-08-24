<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

final class MessageCreatedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'message.created.v1';
    }
}
