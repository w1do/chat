<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Support;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Identity\Domain\Models\User;

/**
 * Адреса изображений профиля для представлений. Отсутствие изображения —
 * это null, а не пустая строка: по этому отличию клиент выбирает запасной
 * вид (spec contracts).
 */
final class AvatarUrl
{
    /** Мелкий размер: списки участников и лента сообщений. */
    public static function thumb(User $user): ?string
    {
        $media = $user->currentAvatar();

        if ($media === null) {
            return null;
        }

        // Пока конверсия готовится, мелкого размера ещё нет — ведём на
        // подготовленный оригинал: он тоже webp, просто крупнее.
        return $media->hasGeneratedConversion('thumb')
            ? self::path('identity.avatars.thumb', $media)
            : self::path('identity.avatars.show', $media);
    }

    public static function large(User $user): ?string
    {
        $media = $user->currentAvatar();

        return $media === null ? null : self::path('identity.avatars.show', $media);
    }

    public static function wallpaper(User $user): ?string
    {
        $media = $user->wallpaper();

        return $media === null ? null : self::path('identity.wallpapers.show', $media);
    }

    private static function path(string $route, Media $media): string
    {
        return route($route, ['image' => (string) $media->uuid], absolute: false);
    }
}
