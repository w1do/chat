<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class ListMembersQuery
{
    public function __construct(public string $roomId) {}
}
