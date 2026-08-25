<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Commands;

use Illuminate\Support\Carbon;
use Vendor\Notifications\Application\Commands\SubscribeDeviceCommand;
use Vendor\Notifications\Domain\Models\PushSubscription;

final readonly class SubscribeDeviceHandler
{
    public function handle(SubscribeDeviceCommand $command): PushSubscription
    {
        // Одно устройство — одна запись: браузер присылает тот же endpoint.
        return PushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashEndpoint($command->endpoint)],
            [
                'user_id' => $command->userId,
                'endpoint' => $command->endpoint,
                'p256dh' => $command->p256dh,
                'auth' => $command->auth,
                'user_agent' => $command->userAgent !== null ? mb_substr($command->userAgent, 0, 255) : null,
                'last_used_at' => Carbon::now(),
            ],
        );
    }
}
