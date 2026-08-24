<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class ToggleReactionCommand
{
    public function __construct(
        public string $messageId,
        public string $userId,
        public string $emoji,
    ) {}
}
