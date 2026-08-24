<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Search;

use Illuminate\Contracts\Bus\Dispatcher;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\MessageDeleted;
use Vendor\Chat\Domain\Events\MessageUpdated;

/**
 * Доменные события → индексация. События публикуются после commit, поэтому
 * откатившаяся транзакция не попадает в индекс.
 */
final readonly class IndexesMessages
{
    public function __construct(private Dispatcher $bus) {}

    public function onMessageCreated(MessageCreated $event): void
    {
        $this->sync($event->messageId);
    }

    public function onMessageUpdated(MessageUpdated $event): void
    {
        $this->sync($event->messageId);
    }

    public function onMessageDeleted(MessageDeleted $event): void
    {
        $this->sync($event->messageId);
    }

    private function sync(string $messageId): void
    {
        if (! config('chat.search.enabled', false)) {
            return;
        }

        $this->bus->dispatch(new SyncMessageIndexJob($messageId));
    }
}
