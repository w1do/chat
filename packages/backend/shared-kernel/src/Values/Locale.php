<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Values;

final readonly class Locale
{
    private function __construct(public string $value) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $value)) {
            throw new \InvalidArgumentException("Invalid locale: {$value}");
        }

        return new self($value);
    }
}
