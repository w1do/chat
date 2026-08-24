<?php

declare(strict_types=1);

namespace Vendor\Ai\Application;

use RuntimeException;

/** Помощник выключен администратором: чат при этом работает как обычно. */
final class AiUnavailable extends RuntimeException
{
    public function __construct(string $message = 'AI assistance is disabled on this server.')
    {
        parent::__construct($message);
    }
}
