<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Commands;

final readonly class PublishFileSummaryCommand
{
    public function __construct(
        public string $userId,
        public string $summaryId,
    ) {}
}
