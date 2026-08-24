<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Queries\ListRoomsQuery;
use Vendor\Chat\Domain\Models\Room;

final readonly class ListRoomsHandler
{
    /** @return list<RoomData> */
    public function handle(ListRoomsQuery $query, Authenticatable $user): array
    {
        $rooms = Room::query()
            ->visibleTo($user)
            ->whereNull('archived_at')
            ->when($query->visibility !== null, fn ($q) => $q->where('visibility', $query->visibility))
            ->when($query->search !== null, fn ($q) => $q->where('name', 'like', '%'.$query->search.'%'))
            ->withCount('members')
            ->with(['members' => fn ($q) => $q->where('user_id', $user->getAuthIdentifier())])
            ->orderBy('name')
            ->get();

        return $rooms->map(fn (Room $room): RoomData => RoomData::fromModel(
            $room,
            myRole: $room->members->first()?->role->value,
            memberCount: (int) $room->members_count,
        ))->all();
    }
}
