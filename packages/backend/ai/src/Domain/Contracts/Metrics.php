<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

/**
 * Счётчики и длительности для наблюдаемости. Имена метрик безопасны:
 * ни текста документа, ни пересказа в них нет (spec: privacy).
 */
interface Metrics
{
    public function increment(string $name, int $by = 1): void;

    public function observeMilliseconds(string $name, int $milliseconds): void;
}
