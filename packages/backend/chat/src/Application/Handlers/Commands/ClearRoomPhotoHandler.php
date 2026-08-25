<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\ClearRoomPhotoCommand;
use Vendor\Chat\Domain\Models\Room;

final readonly class ClearRoomPhotoHandler
{
    public function handle(ClearRoomPhotoCommand $command): void
    {
        Room::query()->findOrFail($command->roomId)->clearMediaCollection(Room::PHOTO);
    }
}
