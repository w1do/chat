<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Пара собеседников диалога. Идентификаторы упорядочены одинаково независимо
 * от того, кто начал переписку: по ключу пары стоит уникальный индекс, и
 * встречное начало даёт один диалог, а не два (design 3).
 */
final readonly class DirectPair
{
    private function __construct(
        public string $first,
        public string $second,
    ) {}

    public static function of(string $a, string $b): self
    {
        if ($a === '' || $b === '') {
            throw new InvalidArgumentException('Both participants are required.');
        }

        if ($a === $b) {
            throw new InvalidArgumentException('A conversation with yourself is not possible.');
        }

        return strcmp($a, $b) < 0 ? new self($a, $b) : new self($b, $a);
    }

    public function key(): string
    {
        return $this->first.':'.$this->second;
    }

    /** Второй участник пары; null, если человек в неё не входит. */
    public static function counterpartOf(string $key, string $userId): ?string
    {
        [$first, $second] = explode(':', $key, 2) + [1 => ''];

        return match ($userId) {
            $first => $second,
            $second => $first,
            default => null,
        };
    }
}
