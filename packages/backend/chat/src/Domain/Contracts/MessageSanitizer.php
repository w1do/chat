<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Contracts;

use Vendor\Chat\Domain\ValueObjects\MessageBody;

interface MessageSanitizer
{
    /** @throws \InvalidArgumentException при пустом или сверхдлинном теле */
    public function sanitize(string $raw): MessageBody;
}
