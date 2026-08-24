<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Identifiers;

use Stringable;
use Symfony\Component\Uid\Uuid as SymfonyUuid;

/** Внешний идентификатор в формате UUID. */
readonly class Uuid implements Stringable
{
    final private function __construct(public string $value) {}

    public static function generate(): static
    {
        return new static((string) SymfonyUuid::v7());
    }

    public static function fromString(string $value): static
    {
        if (! SymfonyUuid::isValid($value)) {
            throw new \InvalidArgumentException("Invalid UUID: {$value}");
        }

        return new static(strtolower($value));
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value && $other instanceof static;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
