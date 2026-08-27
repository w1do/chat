<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use RuntimeException;

/** Из документа не удалось получить текст: имени и содержимого в сообщении нет. */
final class UnreadableDocument extends RuntimeException
{
    public function __construct(string $message = 'Document has no readable text.')
    {
        parent::__construct($message);
    }
}
