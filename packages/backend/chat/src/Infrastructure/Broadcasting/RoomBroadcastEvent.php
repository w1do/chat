<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;

/**
 * Версионированный транспорт (STRUCTURE.md §3): payload — конверт из
 * packages/contracts (event, version, room_id, occurred_at, data), отправка
 * строго после commit; при rollback событие не уходит.
 */
abstract class RoomBroadcastEvent implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    /** @param array<string, mixed> $data */
    public function __construct(
        public readonly string $roomId,
        public readonly array $data,
        public readonly string $occurredAt,
    ) {}

    abstract public function broadcastAs(): string;

    /** @return list<Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('room.'.$this->roomId)];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event' => $this->broadcastAs(),
            'version' => 1,
            'room_id' => $this->roomId,
            'occurred_at' => $this->occurredAt,
            'data' => $this->data,
        ];
    }
}
