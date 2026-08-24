<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

final readonly class TokenUsage
{
    public function __construct(
        public int $promptTokens = 0,
        public int $completionTokens = 0,
    ) {}

    public function total(): int
    {
        return $this->promptTokens + $this->completionTokens;
    }

    /** Стоимость в минимальных единицах валюты (CLAUDE.md §7). */
    public function costInMinorUnits(float $promptPer1k, float $completionPer1k): int
    {
        $cost = ($this->promptTokens / 1000) * $promptPer1k + ($this->completionTokens / 1000) * $completionPer1k;

        return (int) round($cost * 100);
    }
}
