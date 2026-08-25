<?php

declare(strict_types=1);

namespace App\Support\Readiness;

use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Throwable;

/**
 * Доступность объектного хранилища. Проверка чтением несуществующего ключа:
 * доступный бакет отвечает «нет такого» без ошибки, недоступное хранилище
 * или отсутствующий бакет — исключением. Записей проверка не делает —
 * readiness дёргается часто.
 */
final readonly class StorageCheck implements ComponentCheck
{
    public function __construct(private FilesystemFactory $storage) {}

    public function name(): string
    {
        return 'storage';
    }

    public function check(): ComponentStatus
    {
        try {
            $this->storage->disk('media')->fileExists('readiness-probe');

            return ComponentStatus::ok();
        } catch (Throwable) {
            // Причина — в журнале приложения; наружу подробности не уходят.
            return ComponentStatus::fail('unavailable');
        }
    }
}
