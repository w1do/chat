<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use RuntimeException;

/** Ошибка поставщика: наружу уходит без деталей запроса и без ключей. */
final class ProviderUnavailable extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly bool $timedOut = false,
    ) {
        parent::__construct($message);
    }

    public static function timeout(): self
    {
        return new self('AI provider timed out.', timedOut: true);
    }
}
