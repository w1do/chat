<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Events;

/** Доменное событие: происходит внутри транзакции, транспорта не знает. */
final readonly class MessageCreated
{
    public function __construct(
        public string $roomId,
        public string $messageId,
    ) {}
}
