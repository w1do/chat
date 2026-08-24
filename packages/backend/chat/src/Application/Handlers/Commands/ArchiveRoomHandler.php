<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\ArchiveRoomCommand;
use Vendor\Chat\Domain\Models\Room;

final readonly class ArchiveRoomHandler
{
    public function handle(ArchiveRoomCommand $command): void
    {
        /** @var Room $room */
        $room = Room::query()->findOrFail($command->roomId);

        if ($room->isArchived()) {
            return;
        }

        $room->forceFill(['archived_at' => now()])->save();
    }
}
