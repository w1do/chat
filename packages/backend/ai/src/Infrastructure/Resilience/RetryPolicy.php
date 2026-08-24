<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Resilience;

use Vendor\Ai\Domain\Contracts\ProviderUnavailable;

/** Повтор только для сетевых сбоев: таймаут повторять бессмысленно. */
final readonly class RetryPolicy
{
    public function __construct(private int $attempts = 1) {}

    /**
     * @template T
     *
     * @param  callable():T  $operation
     * @return T
     */
    public function run(callable $operation): mixed
    {
        $attempt = 0;

        while (true) {
            try {
                return $operation();
            } catch (ProviderUnavailable $exception) {
                $attempt++;

                if ($exception->timedOut || $attempt > $this->attempts) {
                    throw $exception;
                }
            }
        }
    }
}
