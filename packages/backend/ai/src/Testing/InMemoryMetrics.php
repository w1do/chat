<?php

declare(strict_types=1);

namespace Vendor\Ai\Testing;

use Vendor\Ai\Domain\Contracts\Metrics;

/** Приёмник измерений для тестов: счётчики видны без внешней системы. */
final class InMemoryMetrics implements Metrics
{
    /** @var array<string, int> */
    public array $counters = [];

    public function increment(string $name, int $by = 1): void
    {
        $this->counters[$name] = ($this->counters[$name] ?? 0) + $by;
    }

    public function observeMilliseconds(string $name, int $milliseconds): void
    {
        $this->increment($name.'.count');
        $this->increment($name.'.ms_total', $milliseconds);
    }

    public function value(string $name): int
    {
        return $this->counters[$name] ?? 0;
    }
}
