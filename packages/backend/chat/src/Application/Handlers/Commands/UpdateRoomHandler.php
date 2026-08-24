<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\UpdateRoomCommand;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Domain\Models\Room;

final readonly class UpdateRoomHandler
{
    public function handle(UpdateRoomCommand $command): RoomData
    {
        /** @var Room $room */
        $room = Room::query()->findOrFail($command->roomId);

        $room->fill(array_filter([
            'name' => $command->name,
            'topic' => $command->topic,
        ], fn (?string $value): bool => $value !== null));

        $room->save();

        return RoomData::fromModel($room);
    }
}
