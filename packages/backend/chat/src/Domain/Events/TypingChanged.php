<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Events;

final readonly class TypingChanged
{
    public function __construct(
        public string $roomId,
        public string $userId,
        public bool $isTyping,
    ) {}
}
