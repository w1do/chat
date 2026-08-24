<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

final class ReactionChangedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'reaction.changed.v1';
    }
}
