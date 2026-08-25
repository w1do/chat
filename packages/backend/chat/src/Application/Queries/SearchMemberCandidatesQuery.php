<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Queries;

final readonly class SearchMemberCandidatesQuery
{
    public function __construct(
        public string $roomId,
        public string $term,
    ) {}
}
