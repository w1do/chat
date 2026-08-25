<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Support\Str;
use Throwable;

/**
 * Дымовая проверка хранилища: записать, прочитать, сверить, удалить.
 * Единственный способ доказать, что земля годна, до появления функций,
 * которые в неё пишут (spec self-hosted-runtime).
 */
final class StorageSmoke extends Command
{
    protected $signature = 'storage:smoke';

    protected $description = 'Пишет и читает пробный объект в объектном хранилище, убирая его за собой';

    public function handle(FilesystemFactory $storage): int
    {
        $disk = $storage->disk('media');
        $key = 'smoke/'.Str::ulid()->toBase32();
        $payload = 'storage-smoke '.now()->toIso8601String();

        try {
            $disk->put($key, $payload);
        } catch (Throwable $exception) {
            $this->error('Запись не удалась: '.$exception->getMessage());

            return self::FAILURE;
        }

        try {
            $readBack = $disk->get($key);

            if ($readBack !== $payload) {
                $this->error('Прочитанное не совпало с записанным.');

                return self::FAILURE;
            }
        } catch (Throwable $exception) {
            $this->error('Чтение не удалось: '.$exception->getMessage());

            return self::FAILURE;
        } finally {
            // Пробный объект не должен пережить проверку даже при неудаче чтения.
            try {
                $disk->delete($key);
            } catch (Throwable) {
                $this->warn('Пробный объект не удалось удалить: '.$key);
            }
        }

        $this->info('storage smoke: OK (записано, прочитано, удалено)');

        return self::SUCCESS;
    }
}
