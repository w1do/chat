<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\CreateRoomCommand;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;

final readonly class CreateRoomHandler
{
    public function __construct(private ConnectionResolverInterface $db) {}

    public function handle(CreateRoomCommand $command): RoomData
    {
        $room = $this->db->connection()->transaction(function () use ($command): Room {
            $room = Room::query()->create([
                'name' => $command->name,
                'topic' => $command->topic,
                'visibility' => $command->visibility,
                'created_by' => $command->userId,
            ]);

            $room->members()->create([
                'user_id' => $command->userId,
                'role' => RoomRole::Owner,
                'joined_at' => now(),
            ]);

            return $room;
        });

        return RoomData::fromModel($room, myRole: RoomRole::Owner->value, memberCount: 1);
    }
}
