<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Queries;

final readonly class GetMeQuery
{
    public function __construct(public string $userId) {}
}
