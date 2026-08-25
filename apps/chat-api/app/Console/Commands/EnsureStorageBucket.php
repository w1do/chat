<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Support\Storage\MediaBucket;
use Illuminate\Console\Command;
use Throwable;

final class EnsureStorageBucket extends Command
{
    protected $signature = 'storage:ensure-bucket';

    protected $description = 'Создаёт бакет объектного хранилища, если его ещё нет (идемпотентно)';

    public function handle(MediaBucket $bucket): int
    {
        try {
            $result = $bucket->ensure();
        } catch (Throwable $exception) {
            // Адресов и ключей в выводе нет: сообщение попадает в журнал контейнера.
            $this->error('Объектное хранилище недоступно или не даёт создать бакет: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info($result === 'created' ? 'Бакет создан.' : 'Бакет уже существует.');

        return self::SUCCESS;
    }
}
