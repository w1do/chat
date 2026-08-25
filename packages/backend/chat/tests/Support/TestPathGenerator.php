<?php

declare(strict_types=1);

namespace Vendor\Chat\Tests\Support;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\DefaultPathGenerator;

/**
 * Только для package-тестов: повторяет раскладку бакета приложения
 * (CollectionPathGenerator в apps/chat-api) — вложения под uploads/,
 * фотографии комнат под rooms/. Пакет своей раскладки не везёт: путь в
 * бакете описан один раз в приложении (ADR-011).
 */
final class TestPathGenerator extends DefaultPathGenerator
{
    private const PREFIXES = [
        'attachments' => 'uploads',
        'room-photo' => 'rooms',
    ];

    protected function getBasePath(Media $media): string
    {
        $prefix = self::PREFIXES[$media->collection_name] ?? 'uploads';

        return $prefix.'/'.$media->getKey();
    }
}
