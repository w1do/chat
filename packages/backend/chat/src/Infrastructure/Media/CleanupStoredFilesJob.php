<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Media;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Убирает из объектного хранилища каталоги файлов, записи о которых уже
 * удалены из базы (удаление комнаты, spec chat/rooms-and-messages).
 * Отдельным заданием: недоступное хранилище не останавливает удаление
 * комнаты, а уборка повторяется и не теряется молча.
 *
 * Идемпотентно: удаление отсутствующего каталога — не ошибка.
 */
final class CleanupStoredFilesJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 5;

    public int $timeout = 120;

    /** @param list<string> $directories */
    public function __construct(
        public readonly string $disk,
        public readonly array $directories,
    ) {
        // Очередь медиа: уборка соседствует с конверсиями, а не с перепиской.
        $this->onQueue((string) config('media-library.queue_name', 'media'));
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    public function handle(): void
    {
        $storage = Storage::disk($this->disk);

        foreach ($this->directories as $directory) {
            $storage->deleteDirectory($directory);
        }
    }

    public function failed(?Throwable $exception): void
    {
        // Файлы остались занимать место: об этом должно быть видно в журнале.
        Log::error('chat.attachments.cleanup_failed', [
            'disk' => $this->disk,
            'directories' => $this->directories,
            'error' => $exception?->getMessage(),
        ]);
    }
}
