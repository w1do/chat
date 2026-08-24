<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use InvalidArgumentException;

/** Каноничное тело сообщения: plain text без управляющих символов. */
final readonly class MessageBody
{
    private function __construct(public string $value) {}

    public static function fromUserInput(string $raw, int $maxLength = 4000): self
    {
        // Управляющие символы (кроме \n и \t) удаляются; текст триммится.
        $clean = (string) preg_replace('/[^\P{C}\n\t]+/u', '', $raw);
        $clean = trim($clean);

        if ($clean === '') {
            throw new InvalidArgumentException('Message body must not be empty.');
        }

        if (mb_strlen($clean) > $maxLength) {
            throw new InvalidArgumentException("Message body must not exceed {$maxLength} characters.");
        }

        return new self($clean);
    }
}
