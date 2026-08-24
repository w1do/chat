<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;

/** Полная перестройка индекса из PostgreSQL — источника истины. */
final class ReindexMessagesCommand extends Command
{
    protected $signature = 'chat:search-reindex {--fresh : Пересоздать коллекцию перед загрузкой} {--chunk=500}';

    protected $description = 'Rebuild the message search index from PostgreSQL';

    public function handle(MessageIndex $index): int
    {
        try {
            $this->option('fresh') ? $index->recreateCollection() : $index->ensureCollection();
        } catch (SearchUnavailable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $indexed = 0;

        // Системные записи и мягко удалённые сообщения в индекс не попадают.
        Message::query()
            ->where('kind', MessageKind::Text)
            ->orderBy('id')
            ->chunkById((int) $this->option('chunk'), function (Collection $messages) use ($index, &$indexed): void {
                $index->indexMany($messages->map(
                    static fn (Message $message): IndexedMessage => IndexedMessage::fromModel($message),
                )->values()->all());

                $indexed += $messages->count();
            });

        $this->info("Indexed {$indexed} messages.");

        return self::SUCCESS;
    }
}
