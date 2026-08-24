<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class ListRoomsQuery
{
    public function __construct(
        public ?string $visibility = null,
        public ?string $search = null,
    ) {}
}
