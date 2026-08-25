<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Фотография комнаты для интерфейса. Адрес ведёт в приложение: бакет закрыт,
 * право проверяется на выдаче (ADR-011). В адресе — uuid медиа, поэтому он
 * меняется вместе с картинкой.
 */
final readonly class RoomImageData
{
    public function __construct(
        public string $id,
        public string $url,
        public ?string $thumbUrl,
    ) {}

    public static function fromMedia(Media $media): self
    {
        return new self(
            id: (string) $media->uuid,
            url: self::path('chat.room-photos.show', $media),
            thumbUrl: $media->hasGeneratedConversion('thumb')
                ? self::path('chat.room-photos.thumb', $media)
                : null,
        );
    }

    /** Относительный путь: сервер не обязан знать свой публичный домен. */
    private static function path(string $route, Media $media): string
    {
        return route($route, ['image' => (string) $media->uuid], absolute: false);
    }
}
