<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\ValueObjects;

/** Ответ поставщика по документу: пересказ, модель и расход токенов. */
final readonly class FileSummaryResult
{
    public function __construct(
        public string $summary,
        public string $model,
        public TokenUsage $usage = new TokenUsage,
    ) {}
}
