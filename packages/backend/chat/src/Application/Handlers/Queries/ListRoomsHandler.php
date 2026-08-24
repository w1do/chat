<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Queries\ListRoomsQuery;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

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

        $unread = $this->unreadCounters((string) $user->getAuthIdentifier(), $rooms->pluck('id')->all());

        return $rooms->map(fn (Room $room): RoomData => RoomData::fromModel(
            $room,
            myRole: $room->members->first()?->role->value,
            memberCount: (int) $room->members_count,
            unreadCount: $unread[$room->id] ?? null,
        ))->all();
    }

    /**
     * Непрочитанные сообщения по комнатам, где пользователь состоит:
     * всё, что новее его отметки прочтения и написано не им.
     *
     * @param  list<string>  $roomIds
     * @return array<string, int>
     */
    private function unreadCounters(string $userId, array $roomIds): array
    {
        if ($roomIds === []) {
            return [];
        }

        $memberships = RoomMember::query()
            ->where('user_id', $userId)
            ->whereIn('room_id', $roomIds)
            ->pluck('last_read_message_id', 'room_id');

        if ($memberships->isEmpty()) {
            return [];
        }

        $counts = Message::query()
            ->selectRaw('room_id, count(*) as total')
            ->whereIn('room_id', $memberships->keys())
            ->where('author_id', '!=', $userId)
            ->where(function ($query) use ($memberships): void {
                foreach ($memberships as $roomId => $lastReadId) {
                    $query->orWhere(function ($inner) use ($roomId, $lastReadId): void {
                        $inner->where('room_id', $roomId);
                        if ($lastReadId !== null) {
                            $inner->where('id', '>', $lastReadId);
                        }
                    });
                }
            })
            ->groupBy('room_id')
            ->pluck('total', 'room_id');

        $result = [];
        foreach ($memberships as $roomId => $_) {
            $result[(string) $roomId] = (int) ($counts[$roomId] ?? 0);
        }

        return $result;
    }
}
