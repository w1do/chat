<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Console;

use Illuminate\Console\Command;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

/**
 * Уборка вложений, которые загрузили, но так и не отправили (design 3):
 * брошенные черновики не должны копить файлы в хранилище вечно.
 * Отправленные вложения принадлежат сообщениям и здесь не рассматриваются.
 */
final class PruneAttachmentsCommand extends Command
{
    protected $signature = 'chat:attachments-prune';

    protected $description = 'Удалить загруженные, но не отправленные вложения старше настроенного срока';

    public function handle(): int
    {
        $cutoff = now()->subHours((int) config('chat.attachments.unsent_ttl_hours', 24));

        $stale = Media::query()
            ->where('collection_name', Message::ATTACHMENTS)
            ->where('model_type', (new Room)->getMorphClass())
            ->where('created_at', '<', $cutoff)
            ->get();

        // Удаление по одной модели: библиотека медиа сама убирает файл и
        // миниатюры. Недоступное хранилище оборвёт команду — остаток
        // доубирается следующим запуском по расписанию.
        foreach ($stale as $media) {
            $media->delete();
        }

        $this->info("Убрано неотправленных вложений: {$stale->count()}.");

        return self::SUCCESS;
    }
}
