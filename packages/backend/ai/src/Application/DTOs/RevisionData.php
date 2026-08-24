<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\DTOs;

final readonly class RevisionData
{
    public function __construct(
        public string $requestId,
        public string $operation,
        public string $original,
        public string $suggestion,
        public string $provider,
        public string $model,
    ) {}
}
