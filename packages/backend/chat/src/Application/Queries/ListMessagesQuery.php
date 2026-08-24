<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class ListMessagesQuery
{
    public function __construct(
        public string $roomId,
        public ?string $cursor = null,
        public int $limit = 50,
    ) {}
}
