<?php

declare(strict_types=1);

namespace Vendor\SharedKernel\Identifiers;

use Stringable;
use Symfony\Component\Uid\Ulid as SymfonyUlid;

/** Внешний идентификатор в формате ULID. */
readonly class Ulid implements Stringable
{
    final private function __construct(public string $value) {}

    public static function generate(): static
    {
        return new static((string) new SymfonyUlid);
    }

    public static function fromString(string $value): static
    {
        if (! SymfonyUlid::isValid($value)) {
            throw new \InvalidArgumentException("Invalid ULID: {$value}");
        }

        return new static(strtoupper($value));
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
