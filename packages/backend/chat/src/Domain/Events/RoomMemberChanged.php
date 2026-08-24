<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Events;

/** Доменное событие: происходит внутри транзакции, транспорта не знает. */
final readonly class RoomMemberChanged
{
    public function __construct(
        public string $roomId,
        public string $userId,
        public string $action, // joined | left | invited | role_changed | removed
        public ?string $role,
    ) {}
}
