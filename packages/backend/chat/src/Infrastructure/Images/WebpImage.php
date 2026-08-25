<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Images;

use Spatie\Image\Enums\Fit;
use Spatie\Image\Image;

/**
 * Оформительские изображения хранятся только подготовленными: исходник в
 * бакет не попадает вовсе (ADR-011). Файл приводится к webp нужного размера
 * до передачи медиа-библиотеке — её «оригинал» уже подготовленная копия.
 *
 * Двойник такого же помощника в пакете identity: пакеты не делят между собой
 * инфраструктуру, а shared-kernel остаётся без зависимостей от обработки
 * изображений (STRUCTURE.md §4.1).
 */
final class WebpImage
{
    public static function prepare(string $sourcePath, int $maxWidth, int $maxHeight): string
    {
        $target = tempnam(sys_get_temp_dir(), 'img_').'.webp';

        Image::load($sourcePath)
            ->fit(Fit::Contain, $maxWidth, $maxHeight)
            ->format('webp')
            ->save($target);

        return $target;
    }
}
