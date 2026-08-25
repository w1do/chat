<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Commands;

final readonly class UnsubscribeDeviceCommand
{
    public function __construct(
        public string $userId,
        public string $endpoint,
    ) {}
}
