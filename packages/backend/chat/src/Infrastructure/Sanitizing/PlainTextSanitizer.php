<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Sanitizing;

use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\ValueObjects\MessageBody;

final readonly class PlainTextSanitizer implements MessageSanitizer
{
    public function __construct(private int $maxLength = 4000) {}

    public function sanitize(string $raw): MessageBody
    {
        return MessageBody::fromUserInput($raw, $this->maxLength);
    }

    public function sanitizeOptional(string $raw): ?MessageBody
    {
        return MessageBody::tryFromUserInput($raw, $this->maxLength);
    }
}
