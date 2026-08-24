<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Contracts;

interface Identifiable
{
    public function externalId(): string;
}
