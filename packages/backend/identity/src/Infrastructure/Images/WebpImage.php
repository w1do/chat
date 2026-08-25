<?php

declare(strict_types=1);

namespace Vendor\Identity\Infrastructure\Images;

use Spatie\Image\Enums\Fit;
use Spatie\Image\Image;

/**
 * Оформительские изображения хранятся только подготовленными: исходник в
 * бакет не попадает вовсе (ADR-011, design 6). Поэтому файл приводится к webp
 * нужного размера ещё до передачи медиа-библиотеке — то, что она считает
 * «оригиналом», уже является подготовленной копией.
 */
final class WebpImage
{
    /**
     * Готовит webp во временном файле и отдаёт путь к нему.
     * Вызывающий отвечает за удаление: медиа-библиотека забирает файл себе.
     */
    public static function prepare(string $sourcePath, int $maxWidth, int $maxHeight): string
    {
        $target = tempnam(sys_get_temp_dir(), 'img_').'.webp';

        Image::load($sourcePath)
            // Contain, а не Crop: кадрировать за человека нельзя — он не
            // просил, и обрезанное лицо выглядит поломкой, а не решением.
            ->fit(Fit::Contain, $maxWidth, $maxHeight)
            ->format('webp')
            ->save($target);

        return $target;
    }
}
