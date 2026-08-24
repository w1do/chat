<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

final readonly class ReactionData
{
    public function __construct(
        public string $emoji,
        public int $count,
        public bool $reactedByMe,
    ) {}
}
