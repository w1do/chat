<?php

declare(strict_types=1);

namespace Vendor\Notifications\Domain\Contracts;

use Vendor\Notifications\Domain\Models\PushSubscription;

/**
 * Отправка одного уведомления на устройство. Библиотека Web Push живёт за
 * этим контрактом: приложение может заменить реализацию (§4.1), а тесты —
 * подставить свою, не поднимая настоящий push-сервис.
 */
interface PushTransport
{
    public function deliver(PushSubscription $subscription, string $payload): PushResult;
}
