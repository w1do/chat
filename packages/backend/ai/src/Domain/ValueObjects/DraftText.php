<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

use InvalidArgumentException;

/** Черновик, отправляемый провайдеру: единственный текст, без истории комнаты. */
final readonly class DraftText
{
    private function __construct(public string $value) {}

    public static function fromUserInput(string $raw, int $maxLength): self
    {
        $clean = trim((string) preg_replace('/[^\P{C}\n\t]+/u', '', $raw));

        if ($clean === '') {
            throw new InvalidArgumentException('Draft text must not be empty.');
        }

        if (mb_strlen($clean) > $maxLength) {
            throw new InvalidArgumentException("Draft text must not exceed {$maxLength} characters.");
        }

        return new self($clean);
    }

    public function length(): int
    {
        return mb_strlen($this->value);
    }
}
