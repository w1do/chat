<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Текст документа, уходящий поставщику. Наружу отправляется только он:
 * ни истории комнаты, ни соседних вложений (CLAUDE.md §9).
 */
final readonly class DocumentText
{
    private function __construct(public string $value) {}

    /** Обрезка по количеству символов: длинный документ не разоряет установку. */
    public static function fromExtracted(string $raw, int $maxCharacters): self
    {
        // Управляющие символы и лишние пробелы только жгут токены.
        $clean = (string) preg_replace('/[^\P{C}\n\t]+/u', ' ', $raw);
        $clean = trim((string) preg_replace('/[ \t]+/u', ' ', $clean));
        $clean = (string) preg_replace('/\n{3,}/u', "\n\n", $clean);

        if ($clean === '') {
            throw new InvalidArgumentException('Document has no readable text.');
        }

        return new self(mb_substr($clean, 0, max(1, $maxCharacters)));
    }

    public function length(): int
    {
        return mb_strlen($this->value);
    }
}
