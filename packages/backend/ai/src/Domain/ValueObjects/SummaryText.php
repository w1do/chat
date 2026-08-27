<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Пересказ в оговорённом окне длины. Поставщики промахиваются мимо длины,
 * поэтому окно выдерживает клиент: обрезаем по границе предложения, а не
 * посреди слова (design: length drift mitigation).
 */
final readonly class SummaryText
{
    private function __construct(public string $value) {}

    /**
     * @param  int  $min  нижняя граница окна — короче не обрезаем
     * @param  int  $max  верхняя граница окна — длиннее не отдаём
     */
    public static function clamp(string $raw, int $min, int $max): self
    {
        if ($min < 1 || $max < $min) {
            throw new InvalidArgumentException('Summary window must be a positive range.');
        }

        $clean = trim((string) preg_replace('/[^\P{C}\n]+/u', ' ', $raw));
        $clean = trim((string) preg_replace('/[ \t]+/u', ' ', $clean));

        if ($clean === '') {
            throw new InvalidArgumentException('Summary must not be empty.');
        }

        if (mb_strlen($clean) <= $max) {
            return new self($clean);
        }

        return new self(self::cutToSentence($clean, $min, $max));
    }

    /** Дошёл ли пересказ до нижней границы окна. */
    public function isWithin(int $min, int $max): bool
    {
        $length = mb_strlen($this->value);

        return $length >= $min && $length <= $max;
    }

    public function length(): int
    {
        return mb_strlen($this->value);
    }

    /**
     * Последняя точка/восклицательный/вопросительный знак в окне [min, max].
     * Нет знака — режем по последнему пробелу и ставим многоточие, чтобы не
     * обрывать слово.
     */
    private static function cutToSentence(string $text, int $min, int $max): string
    {
        $window = mb_substr($text, 0, $max);

        $best = 0;
        foreach (['.', '!', '?', '…'] as $terminator) {
            $position = mb_strrpos($window, $terminator);

            if ($position !== false && $position + 1 >= $min && $position + 1 > $best) {
                $best = $position + 1;
            }
        }

        if ($best > 0) {
            return trim(mb_substr($window, 0, $best));
        }

        $space = mb_strrpos(mb_substr($window, 0, $max - 1), ' ');
        $cut = $space !== false && $space + 1 >= $min ? $space : $max - 1;

        return trim(mb_substr($window, 0, $cut)).'…';
    }
}
