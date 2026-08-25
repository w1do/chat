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

    public function deliver(PushSubscription $subscription, string $payload, ?string $topic = null): PushResult
    {
        $push = new WebPush([
            'VAPID' => [
                'subject' => (string) $this->config->get('notifications.push.subject'),
                'publicKey' => (string) $this->config->get('notifications.push.public_key'),
                'privateKey' => (string) $this->config->get('notifications.push.private_key'),
            ],
        ]);

        $report = $push->sendOneNotification(
            LibrarySubscription::create([
                'endpoint' => $subscription->endpoint,
                'keys' => ['p256dh' => $subscription->p256dh, 'auth' => $subscription->auth],
            ]),
            $payload,
            $this->options($topic),
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

    /**
     * Параметры отправки. Срочность указываем явно: без заголовка push-сервис
     * считает уведомление обычным и не будит спящее устройство — на Android оно
     * тогда ждёт, пока человек сам возьмёт телефон. Всё, что мы шлём в push, —
     * повод посмотреть в телефон, поэтому срочность одна для всех уведомлений.
     *
     * @return array<string, mixed>
     */
    private function options(?string $topic): array
    {
        $options = [
            'TTL' => (int) $this->config->get('notifications.push.ttl_seconds', 1800),
            'urgency' => 'high',
        ];

        if ($topic !== null) {
            $options['topic'] = $this->topicToken($topic);
        }

        return $options;
    }

    /**
     * Тема ограничена спецификацией: не длиннее 32 символов из безопасного
     * алфавита (RFC 8030 §5.4). Наши ключи схлопывания длиннее и содержат
     * двоеточие, поэтому отдаём их отпечаток — совпадать он будет ровно тогда,
     * когда совпадает сам ключ.
     */
    private function topicToken(string $topic): string
    {
        return substr(hash('sha256', $topic), 0, 32);
    }
}
