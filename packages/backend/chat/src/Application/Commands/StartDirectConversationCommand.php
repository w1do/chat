<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class StartDirectConversationCommand
{
    public function __construct(
        public string $initiatorId,
        public string $counterpartId,
    ) {}
}
