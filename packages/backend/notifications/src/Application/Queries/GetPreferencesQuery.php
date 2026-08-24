<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Queries;

final readonly class GetPreferencesQuery
{
    public function __construct(public string $userId) {}
}
