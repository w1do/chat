<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PresenceChannel;

final class TypingChangedV1 extends RoomBroadcastEvent
{
    public function broadcastAs(): string
    {
        return 'typing.changed.v1';
    }

    /** @return list<Channel> */
    public function broadcastOn(): array
    {
        // Typing/presence идут через presence-канал комнаты.
        return [new PresenceChannel('room.'.$this->roomId.'.presence')];
    }
}
