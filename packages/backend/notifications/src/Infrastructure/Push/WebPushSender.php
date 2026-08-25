<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Push;

use Illuminate\Contracts\Config\Repository;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Models\PushSubscription;

/**
 * Отправка Web Push на устройства получателя.
 *
 * Наружу уходит ровно то, что человек и так увидит в ленте уведомлений:
 * комната, автор и короткий фрагмент. Аннулированные подписки удаляются —
 * их отменил сам push-сервис; прочие ошибки поднимаются, чтобы очередь
 * повторила попытку.
 */
final readonly class WebPushSender
{
    public function __construct(
        private Repository $config,
        private PushTransport $transport,
    ) {}

    /** Push настроен только когда заданы обе половины пары VAPID. */
    public function isConfigured(): bool
    {
        return trim((string) $this->config->get('notifications.push.public_key')) !== ''
            && trim((string) $this->config->get('notifications.push.private_key')) !== '';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return int число устройств, которым уведомление ушло
     */
    public function send(string $recipientId, Category $category, array $payload): int
    {
        if (! $this->isConfigured()) {
            return 0;
        }

        $subscriptions = PushSubscription::query()->where('user_id', $recipientId)->get();
        $notification = $this->notification($category, $payload);
        $body = (string) json_encode($notification, JSON_UNESCAPED_UNICODE);
        // Тема та же, по которой клиент схлопывает уведомления: пока прошлое
        // не доставлено, push-сервис заменит его новым вместо очереди устаревших.
        $topic = (string) $notification['tag'];
        $delivered = 0;
        $failure = null;

        foreach ($subscriptions as $subscription) {
            $result = $this->transport->deliver($subscription, $body, $topic);

            if ($result->delivered) {
                $delivered++;

                continue;
            }

            if ($result->gone) {
                $subscription->delete();

                continue;
            }

            // Одно мёртвое устройство не должно мешать остальным: сначала
            // обходим все, ошибку поднимаем в конце.
            $failure ??= $result->reason;
        }

        if ($failure !== null) {
            throw new PushDeliveryFailed($failure);
        }

        return $delivered;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function notification(Category $category, array $payload): array
    {
        $length = (int) $this->config->get('notifications.push.preview_length', 120);
        $preview = (string) ($payload['preview'] ?? '');

        return [
            'title' => (string) ($payload['room_name'] ?? 'Чат'),
            'body' => trim(($payload['actor_name'] ?? '').': '.$this->shorten($preview, $length), ': '),
            'category' => $category->value,
            // Клиент откроет комнату по этому адресу.
            'url' => isset($payload['room_id']) ? '/rooms/'.$payload['room_id'] : '/',
            'tag' => $category->value.':'.($payload['room_id'] ?? ''),
        ];
    }

    private function shorten(string $text, int $length): string
    {
        return mb_strlen($text) > $length ? mb_substr($text, 0, $length).'…' : $text;
    }
}
