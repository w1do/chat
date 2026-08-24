<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Курсор истории: ULID последнего сообщения предыдущей страницы.
 * ULID монотонен, поэтому порядок стабилен и без дублей.
 */
final readonly class MessageCursor
{
    private function __construct(public ?string $beforeId) {}

    public static function start(): self
    {
        return new self(null);
    }

    public static function fromString(?string $cursor): self
    {
        if ($cursor === null || $cursor === '') {
            return self::start();
        }

        if (! preg_match('/^[0-7][0-9a-hjkmnp-tv-zA-HJKMNP-TV-Z]{25}$/', $cursor)) {
            throw new InvalidArgumentException('Invalid message cursor.');
        }

        return new self($cursor);
    }

    public function isStart(): bool
    {
        return $this->beforeId === null;
    }
}
