<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Commands;

final readonly class SubscribeDeviceCommand
{
    public function __construct(
        public string $userId,
        public string $endpoint,
        public string $p256dh,
        public string $auth,
        public ?string $userAgent = null,
    ) {}
}
