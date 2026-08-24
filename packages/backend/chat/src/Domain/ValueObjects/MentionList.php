<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use InvalidArgumentException;

/** Уникальный список упомянутых пользователей (ULID). */
final readonly class MentionList
{
    /** @param list<string> $userIds */
    private function __construct(public array $userIds) {}

    /** @param list<string> $userIds */
    public static function fromUserIds(array $userIds): self
    {
        $unique = array_values(array_unique($userIds));

        foreach ($unique as $id) {
            if (! preg_match('/^[0-7][0-9a-hjkmnp-tv-zA-HJKMNP-TV-Z]{25}$/', $id)) {
                throw new InvalidArgumentException("Invalid mention user id: {$id}");
            }
        }

        return new self($unique);
    }

    public static function empty(): self
    {
        return new self([]);
    }

    public function isEmpty(): bool
    {
        return $this->userIds === [];
    }
}
