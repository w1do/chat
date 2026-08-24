<?php

declare(strict_types=1);

namespace App\Support\Readiness;

use Illuminate\Contracts\Redis\Factory;
use Throwable;

final readonly class RedisCheck implements ComponentCheck
{
    public function __construct(private Factory $redis) {}

    public function name(): string
    {
        return 'redis';
    }

    public function check(): ComponentStatus
    {
        try {
            $this->redis->connection()->command('ping');

            return ComponentStatus::ok();
        } catch (Throwable) {
            return ComponentStatus::fail('connection failed');
        }
    }
}
