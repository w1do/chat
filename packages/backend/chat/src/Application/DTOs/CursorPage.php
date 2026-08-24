<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

final readonly class CursorPage
{
    /** @param list<MessageData> $items */
    public function __construct(
        public array $items,
        public ?string $nextCursor,
    ) {}
}
