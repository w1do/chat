<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class SearchMessagesQuery
{
    public function __construct(
        public string $term,
        public ?string $roomId = null,
        public int $limit = 20,
    ) {}
}
