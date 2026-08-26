<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Illuminate\Contracts\Auth\Authenticatable;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Queries\ListRoomsQuery;
use Vendor\Chat\Application\Support\Counterparts;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class ListRoomsHandler
{
    /** @return list<RoomData> */
    public function handle(ListRoomsQuery $query, Authenticatable $user): array
    {
        $viewerId = (string) $user->getAuthIdentifier();

        $rooms = Room::query()
            ->visibleTo($user)
            ->whereNull('archived_at')
            ->when($query->visibility !== null, fn ($q) => $q->where('visibility', $query->visibility))
            ->withCount('members')
            ->with(['members' => fn ($q) => $q->where('user_id', $viewerId)])
            ->get();

        // Скрытые диалоги не показываются до нового сообщения; у собеседника,
        // которому ещё не написали, запись участия скрыта с самого начала —
        // пустой диалог виден только инициатору (spec chat/direct-messages).
        $rooms = $rooms->reject(
            fn (Room $room): bool => $room->isDirect() && $room->members->first()?->hidden_at !== null,
        );

        // Собеседники диалогов — одним запросом на весь список (design 5).
        $counterparts = Counterparts::forRooms($rooms->all(), $viewerId);

        // Подпись переписки: название комнаты или имя собеседника. Поиск и
        // порядок списка живут на подписи — одно правило на оба вида.
        $labeled = $rooms
            ->map(fn (Room $room): array => [
                'room' => $room,
                'label' => $room->isDirect() ? (string) ($counterparts[$room->id]->name ?? '') : $room->name,
            ])
            ->when($query->search !== null, fn ($collection) => $collection->filter(
                fn (array $entry): bool => mb_stripos($entry['label'], trim((string) $query->search)) !== false,
            ))
            ->sortBy(fn (array $entry): string => mb_strtolower($entry['label']))
            ->values();

        $unread = $this->unreadCounters($viewerId, $labeled->pluck('room.id')->all());

        return $labeled->map(fn (array $entry): RoomData => RoomData::fromModel(
            $entry['room'],
            myRole: $entry['room']->members->first()?->role->value,
            memberCount: (int) $entry['room']->members_count,
            unreadCount: $unread[$entry['room']->id] ?? null,
            counterpart: $counterparts[$entry['room']->id] ?? null,
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
