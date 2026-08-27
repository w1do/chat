<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Quota;

use Illuminate\Cache\RateLimiter as LaravelRateLimiter;

/**
 * Квоты пересказа: на пользователя — от одиночного перерасхода, на установку
 * (единственный проект, CLAUDE.md §2) — от общего счёта у поставщика.
 */
final readonly class SummaryQuota
{
    public function __construct(
        private LaravelRateLimiter $limiter,
        private int $perUserHourly,
        private int $perInstallHourly,
    ) {}

    /** @throws QuotaExceeded */
    public function assertWithinQuota(string $userId): void
    {
        foreach ($this->buckets($userId) as [$key, $limit]) {
            if ($this->limiter->tooManyAttempts($key, $limit)) {
                throw new QuotaExceeded($this->limiter->availableIn($key));
            }
        }
    }

    public function record(string $userId): void
    {
        foreach ($this->buckets($userId) as [$key]) {
            $this->limiter->hit($key, 3600);
        }
    }

    /** @return list<array{0: string, 1: int}> */
    private function buckets(string $userId): array
    {
        return [
            ["ai:summary:user:{$userId}:hour", $this->perUserHourly],
            ['ai:summary:install:hour', $this->perInstallHourly],
        ];
    }
}
