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

        if ($command->name !== null) {
            $room->name = $command->name;
        }

        // Пустое описание — это «описания нет», а не «не трогать».
        if ($command->topicProvided) {
            $topic = $command->topic === null ? null : trim($command->topic);
            $room->topic = ($topic === null || $topic === '') ? null : $topic;
        }

        $room->save();

        return RoomData::fromModel($room);
    }
}
