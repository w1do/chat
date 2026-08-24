<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Quota;

use Illuminate\Cache\RateLimiter as LaravelRateLimiter;

/** Квоты на пользователя: минутная защищает от очередей, часовая — от расходов. */
final readonly class RateLimiter
{
    public function __construct(
        private LaravelRateLimiter $limiter,
        private int $perMinute,
        private int $perHour,
    ) {}

    /** @throws QuotaExceeded */
    public function assertWithinQuota(string $userId): void
    {
        foreach ([["ai:{$userId}:minute", $this->perMinute, 60], ["ai:{$userId}:hour", $this->perHour, 3600]] as [$key, $limit, $decay]) {
            if ($this->limiter->tooManyAttempts($key, $limit)) {
                throw new QuotaExceeded($this->limiter->availableIn($key));
            }
        }
    }

    public function record(string $userId): void
    {
        $this->limiter->hit("ai:{$userId}:minute", 60);
        $this->limiter->hit("ai:{$userId}:hour", 3600);
    }
}
