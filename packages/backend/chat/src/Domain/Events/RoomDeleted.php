<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Events;

/** Доменное событие: комната удалена навсегда. Транспорта не знает. */
final readonly class RoomDeleted
{
    /** @param list<string> $messageIds сообщения, которые исчезли вместе с комнатой */
    public function __construct(
        public string $roomId,
        public string $roomName,
        public string $actorId,
        public array $messageIds,
    ) {}
}
