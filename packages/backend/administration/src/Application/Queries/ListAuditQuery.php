<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Queries;

final readonly class ListAuditQuery
{
    public function __construct(
        public ?string $action = null,
        public ?string $actorId = null,
        public ?string $cursor = null,
        public int $limit = 50,
    ) {}
}
