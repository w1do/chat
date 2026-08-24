<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Events;

final readonly class ReactionChanged
{
    public function __construct(
        public string $roomId,
        public string $messageId,
        public string $userId,
        public string $emoji,
        public string $action, // added | removed
        public int $count,
    ) {}
}
