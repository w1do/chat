<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\SetRoomPhotoCommand;
use Vendor\Chat\Application\DTOs\RoomImageData;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Infrastructure\Images\WebpImage;

/** Новая фотография вытесняет прежнюю вместе с её файлами (spec). */
final readonly class SetRoomPhotoHandler
{
    public function handle(SetRoomPhotoCommand $command): RoomImageData
    {
        $room = Room::query()->findOrFail($command->roomId);
        $size = (int) config('chat.images.photo.large', 512);

        $prepared = WebpImage::prepare($command->filePath, $size, $size);

        $media = $room->addMedia($prepared)
            ->usingFileName(pathinfo($command->fileName, PATHINFO_FILENAME).'.webp')
            ->toMediaCollection(Room::PHOTO);

        // Конверсия могла успеть выполниться: перечитываем, чтобы мелкий
        // размер не выглядел неготовым.
        return RoomImageData::fromMedia($media->refresh());
    }
}
