<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Push;

use Illuminate\Contracts\Config\Repository;
use Minishlink\WebPush\Subscription as LibrarySubscription;
use Minishlink\WebPush\WebPush;
use Vendor\Notifications\Domain\Contracts\PushResult;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Domain\Models\PushSubscription;

/** Реализация на minishlink/web-push: подпись VAPID и шифрование полезной нагрузки. */
final readonly class WebPushTransport implements PushTransport
{
    public function __construct(private Repository $config) {}

    public function deliver(PushSubscription $subscription, string $payload): PushResult
    {
        $push = new WebPush([
            'VAPID' => [
                'subject' => (string) $this->config->get('notifications.push.subject'),
                'publicKey' => (string) $this->config->get('notifications.push.public_key'),
                'privateKey' => (string) $this->config->get('notifications.push.private_key'),
            ],
        ]);
        $push->setDefaultOptions(['TTL' => (int) $this->config->get('notifications.push.ttl_seconds', 1800)]);

        $report = $push->sendOneNotification(
            LibrarySubscription::create([
                'endpoint' => $subscription->endpoint,
                'keys' => ['p256dh' => $subscription->p256dh, 'auth' => $subscription->auth],
            ]),
            $payload,
        );

        if ($report->isSuccess()) {
            return PushResult::delivered();
        }

        $status = $report->getResponse()?->getStatusCode();

        // 404/410 — подписки больше нет; остальное повторим позже.
        return $status === 404 || $status === 410
            ? PushResult::gone()
            : PushResult::failed($report->getReason());
    }
}
