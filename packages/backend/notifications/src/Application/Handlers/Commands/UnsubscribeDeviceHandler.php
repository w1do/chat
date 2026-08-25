<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Commands;

use Vendor\Notifications\Application\Commands\UnsubscribeDeviceCommand;
use Vendor\Notifications\Domain\Models\PushSubscription;

final readonly class UnsubscribeDeviceHandler
{
    /** @return bool была ли удалена подписка этого пользователя */
    public function handle(UnsubscribeDeviceCommand $command): bool
    {
        // Чужую подписку не трогаем: владелец проверяется тем же запросом.
        return PushSubscription::query()
            ->where('endpoint_hash', PushSubscription::hashEndpoint($command->endpoint))
            ->where('user_id', $command->userId)
            ->delete() > 0;
    }
}
