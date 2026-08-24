<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Values;

use DateTimeZone;

final readonly class Timezone
{
    private function __construct(public string $value) {}

    public static function fromString(string $value): self
    {
        if (! in_array($value, DateTimeZone::listIdentifiers(), true)) {
            throw new \InvalidArgumentException("Invalid timezone: {$value}");
        }

        return new self($value);
    }
}
