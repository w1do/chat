<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Изображение профиля для интерфейса. Адрес ведёт в приложение, а не в
 * хранилище (design 8): право проверяется на выдаче. В адресе — uuid медиа,
 * поэтому он меняется вместе с картинкой и его можно долго кэшировать.
 */
final readonly class ProfileImageData
{
    public function __construct(
        public string $id,
        public string $url,
        public ?string $thumbUrl,
        public bool $current,
    ) {}

    public static function avatar(Media $media, bool $current): self
    {
        return new self(
            id: (string) $media->uuid,
            url: self::path('identity.avatars.show', $media),
            // Пока конверсия не готова, мелкого размера ещё нет: интерфейс
            // покажет запасной вид, а не сломанную картинку (spec).
            thumbUrl: $media->hasGeneratedConversion('thumb')
                ? self::path('identity.avatars.thumb', $media)
                : null,
            current: $current,
        );
    }

    public static function wallpaper(Media $media): self
    {
        return new self(
            id: (string) $media->uuid,
            url: self::path('identity.wallpapers.show', $media),
            thumbUrl: null,
            current: true,
        );
    }

    /** Относительный путь: сервер не обязан знать свой публичный домен. */
    private static function path(string $route, Media $media): string
    {
        return route($route, ['image' => (string) $media->uuid], absolute: false);
    }
}
