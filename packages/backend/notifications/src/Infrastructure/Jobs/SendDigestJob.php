<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Infrastructure\Channels\MailChannelSender;

/** Сводка непрочитанного за период: один конверт вместо потока писем. */
final class SendDigestJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $recipientId,
        public readonly string $since,
    ) {
        // Сводка — это и есть рассылка: её место в очереди рассылок, где она
        // никого не задерживает.
        $this->onQueue((string) config('notifications.queues.bulk', 'notifications-bulk'));
    }

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
        return "digest:{$this->recipientId}:{$this->since}";
    }

    public function uniqueFor(): int
    {
        return 3600;
    }

    public function handle(MailChannelSender $mail): void
    {
        $unread = DB::table('notifications')
            ->where('notifiable_id', $this->recipientId)
            ->whereNull('read_at')
            ->where('created_at', '>=', $this->since)
            ->count();

        if ($unread === 0) {
            return;
        }

        $mail->send($this->recipientId, Category::Message, [
            'category' => 'digest',
            'unread' => $unread,
            'since' => $this->since,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::warning('notification digest failed', [
            'recipient_id' => $this->recipientId,
            'reason' => $exception::class,
        ]);
    }
}
