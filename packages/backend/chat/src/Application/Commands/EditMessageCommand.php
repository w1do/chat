<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class EditMessageCommand
{
    public function __construct(
        public string $messageId,
        public string $body,
    ) {}
}
