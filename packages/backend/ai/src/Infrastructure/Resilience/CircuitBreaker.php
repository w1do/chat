<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Resilience;

use Illuminate\Contracts\Cache\Repository as Cache;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;

/**
 * После череды отказов поставщик не дёргается ещё некоторое время:
 * чат не ждёт заведомо провальных вызовов.
 */
final readonly class CircuitBreaker
{
    public function __construct(
        private Cache $cache,
        private int $failuresBeforeOpen = 5,
        private int $openSeconds = 60,
    ) {}

    public function isOpen(string $provider): bool
    {
        return (bool) $this->cache->get($this->openKey($provider), false);
    }

    /**
     * @template T
     *
     * @param  callable():T  $operation
     * @return T
     */
    public function call(string $provider, callable $operation): mixed
    {
        if ($this->isOpen($provider)) {
            throw new ProviderUnavailable('AI provider is temporarily unavailable.');
        }

        try {
            $result = $operation();
        } catch (ProviderUnavailable $exception) {
            $this->recordFailure($provider);

            throw $exception;
        }

        $this->cache->forget($this->failureKey($provider));

        return $result;
    }

    private function recordFailure(string $provider): void
    {
        $failures = (int) $this->cache->get($this->failureKey($provider), 0) + 1;
        $this->cache->put($this->failureKey($provider), $failures, $this->openSeconds * 2);

        if ($failures >= $this->failuresBeforeOpen) {
            $this->cache->put($this->openKey($provider), true, $this->openSeconds);
            $this->cache->forget($this->failureKey($provider));
        }
    }

    private function failureKey(string $provider): string
    {
        return "ai:breaker:{$provider}:failures";
    }

    private function openKey(string $provider): string
    {
        return "ai:breaker:{$provider}:open";
    }
}
