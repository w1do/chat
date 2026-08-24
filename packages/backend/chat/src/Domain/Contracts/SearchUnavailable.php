<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Contracts;

use RuntimeException;

/** Индекс недоступен или выключен: наружу уходит документированный 503 без деталей. */
final class SearchUnavailable extends RuntimeException
{
    public static function disabled(): self
    {
        return new self('Message search is disabled.');
    }

    public static function unreachable(): self
    {
        return new self('Search index is unreachable.');
    }
}
