<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Search;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;

/**
 * Приводит документ индекса к текущему состоянию строки в PostgreSQL:
 * создание, правка и мягкое удаление обрабатываются одним путём, поэтому
 * повтор задания и любой их порядок дают один и тот же результат.
 */
final class SyncMessageIndexJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly string $messageId)
    {
        $this->onQueue((string) config('chat.search.queue', 'search'));
    }

    public function tries(): int
    {
        return (int) config('chat.search.job.tries', 3);
    }

    public function timeout(): int
    {
        return (int) config('chat.search.job.timeout', 20);
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return config('chat.search.job.backoff', [10, 60, 300]);
    }

    public function uniqueId(): string
    {
        return $this->messageId;
    }

    public function handle(MessageIndex $index): void
    {
        /** @var ?Message $message */
        $message = Message::query()->withTrashed()->find($this->messageId);

        // Нет строки, она удалена или это системная запись — в индексе ей не место.
        if ($message === null || $message->trashed() || $message->isSystem()) {
            $index->remove($this->messageId);

            return;
        }

        $index->index(IndexedMessage::fromModel($message));
    }

    public function failed(Throwable $exception): void
    {
        // Индекс перестраиваем командой; текст сообщения в журнал не пишем.
        Log::warning('chat.search.sync_failed', [
            'message_id' => $this->messageId,
            'reason' => $exception::class,
        ]);
    }
}
