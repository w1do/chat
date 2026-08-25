<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Support;

use Illuminate\Database\Eloquent\Builder;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

/**
 * Загруженные, но ещё не отправленные вложения. До отправки файл висит на
 * комнате с отметкой автора; отправка перевешивает его на сообщение
 * (design 3). Здесь — единственное определение этого состояния.
 */
final class PendingAttachments
{
    /** @return Builder<Media> */
    public static function query(string $roomId): Builder
    {
        return Media::query()
            ->where('collection_name', Message::ATTACHMENTS)
            ->where('model_type', (new Room)->getMorphClass())
            ->where('model_id', $roomId);
    }

    public static function countFor(string $roomId, string $uploaderId): int
    {
        return self::query($roomId)
            ->where('custom_properties->uploader_id', $uploaderId)
            ->count();
    }
}
