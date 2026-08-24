<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Contracts;

use DateTimeImmutable;

interface Clock
{
    public function now(): DateTimeImmutable;
}
