<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class GetUnreadCountersQuery
{
    public function __construct(public string $userId) {}
}
