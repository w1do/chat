<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Support;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Domain\Models\Room;

/**
 * Адреса фотографии комнаты для представлений. Отсутствие фотографии — это
 * null, а не пустая строка: по этому отличию клиент рисует эмодзи (spec).
 */
final class RoomPhotoUrl
{
    public static function thumb(Room $room): ?string
    {
        $media = $room->photo();

        if ($media === null) {
            return null;
        }

        // Пока конверсия готовится, мелкого размера нет — ведём на
        // подготовленный оригинал: он тоже webp, просто крупнее.
        return $media->hasGeneratedConversion('thumb')
            ? self::path('chat.room-photos.thumb', $media)
            : self::path('chat.room-photos.show', $media);
    }

    public static function large(Room $room): ?string
    {
        $media = $room->photo();

        return $media === null ? null : self::path('chat.room-photos.show', $media);
    }

    private static function path(string $route, Media $media): string
    {
        return route($route, ['image' => (string) $media->uuid], absolute: false);
    }
}
