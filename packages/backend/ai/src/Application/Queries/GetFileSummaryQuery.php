<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Queries;

final readonly class GetFileSummaryQuery
{
    public function __construct(
        public string $userId,
        public string $summaryId,
    ) {}
}
