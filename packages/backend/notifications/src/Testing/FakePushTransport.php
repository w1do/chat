<?php

declare(strict_types=1);

namespace Vendor\Notifications\Testing;

use Vendor\Notifications\Domain\Contracts\PushResult;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Domain\Models\PushSubscription;

/** Транспорт для тестов: запоминает отправленное и отвечает заданным итогом. */
final class FakePushTransport implements PushTransport
{
    /** @var list<array{endpoint: string, payload: string}> */
    public array $sent = [];

    private PushResult $result;

    public function __construct(?PushResult $result = null)
    {
        $this->result = $result ?? PushResult::delivered();
    }

    public function deliver(PushSubscription $subscription, string $payload): PushResult
    {
        $this->sent[] = ['endpoint' => $subscription->endpoint, 'payload' => $payload];

        return $this->result;
    }

    public function answerWith(PushResult $result): void
    {
        $this->result = $result;
    }
}
