<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Observability;

use Illuminate\Contracts\Cache\Repository as Cache;
use Vendor\Ai\Domain\Contracts\Metrics;

/**
 * Счётчики в общем кэше (Redis в production): переживают перезапуск воркера
 * и видны всем процессам. Ни текста документа, ни пересказа в ключах нет.
 */
final readonly class CacheMetrics implements Metrics
{
    private const TTL_SECONDS = 86400;

    public function __construct(private Cache $cache) {}

    public function increment(string $name, int $by = 1): void
    {
        $key = $this->key($name);

        // add() ставит стартовое значение с TTL, increment() — дальше по нему.
        $this->cache->add($key, 0, self::TTL_SECONDS);
        $this->cache->increment($key, $by);
    }

    public function observeMilliseconds(string $name, int $milliseconds): void
    {
        $this->increment($name.'.count');
        $this->increment($name.'.ms_total', $milliseconds);
    }

    private function key(string $name): string
    {
        return "ai:metrics:{$name}";
    }
}
