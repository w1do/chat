<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Quota;

use RuntimeException;

final class QuotaExceeded extends RuntimeException
{
    public function __construct(public readonly int $retryAfterSeconds)
    {
        parent::__construct('AI quota exceeded.');
    }
}
