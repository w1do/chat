<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Commands;

final readonly class ReviseDraftCommand
{
    public function __construct(
        public string $userId,
        public string $operation,
        public string $text,
        public ?string $tone = null,
        public ?string $instruction = null,
    ) {}
}
