<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;
use Vendor\Notifications\Infrastructure\Channels\MailChannelSender;

/**
 * Доставка медленного канала. Идемпотентно: уникальный замок гасит дубли при
 * сетевых повторах, а падение письма не трогает сохранённое сообщение.
 */
final class DeliverNotificationJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** @param array<string, mixed> $payload */
    public function __construct(
        public readonly string $recipientId,
        public readonly Category $category,
        public readonly Channel $channel,
        public readonly array $payload,
        public readonly ?string $notificationId = null,
    ) {}

    public function tries(): int
    {
        return (int) config('notifications.jobs.tries', 3);
    }

    public function timeout(): int
    {
        return (int) config('notifications.jobs.timeout', 30);
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return config('notifications.jobs.backoff', [10, 60, 300]);
    }

    public function uniqueId(): string
    {
        // Один и тот же повод не отправляется дважды в пределах окна.
        return implode(':', [
            $this->recipientId,
            $this->channel->value,
            $this->notificationId ?? ($this->payload['room_id'] ?? '').':'.($this->payload['message_id'] ?? ''),
        ]);
    }

    public function uniqueFor(): int
    {
        return (int) config('notifications.jobs.unique_seconds', 120);
    }

    public function handle(MailChannelSender $mail): void
    {
        if ($this->channel === Channel::Mail) {
            $mail->send($this->recipientId, $this->category, $this->payload);
        }
    }

    public function failed(Throwable $exception): void
    {
        // Провал доставки не влияет на сообщение и на real-time: только запись в журнал.
        Log::warning('notification delivery failed', [
            'recipient_id' => $this->recipientId,
            'category' => $this->category->value,
            'channel' => $this->channel->value,
            'reason' => $exception::class,
        ]);
    }
}
