<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Queries\GetRoomQuery;
use Vendor\Chat\Application\Support\Counterparts;
use Vendor\Chat\Domain\Models\Room;

final readonly class GetRoomHandler
{
    public function handle(GetRoomQuery $query, Authenticatable $user): RoomData
    {
        /** @var Room $room */
        $room = Room::query()->withCount('members')->findOrFail($query->roomId);

        $viewerId = (string) $user->getAuthIdentifier();

        return RoomData::fromModel(
            $room,
            myRole: $room->roleOf($user)?->value,
            memberCount: (int) $room->members_count,
            counterpart: Counterparts::forRooms([$room], $viewerId)[$room->id] ?? null,
        );
    }
}
