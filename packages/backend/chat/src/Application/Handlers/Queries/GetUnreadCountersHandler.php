<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Vendor\Chat\Application\Queries\GetUnreadCountersQuery;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class GetUnreadCountersHandler
{
    /** @return array<string, int> room_id → количество непрочитанных */
    public function handle(GetUnreadCountersQuery $query): array
    {
        $memberships = RoomMember::query()
            ->where('user_id', $query->userId)
            ->get(['room_id', 'last_read_message_id']);

        $counters = [];
        foreach ($memberships as $membership) {
            $counters[$membership->room_id] = Message::query()
                ->where('room_id', $membership->room_id)
                ->where('author_id', '!=', $query->userId)
                ->when(
                    $membership->last_read_message_id !== null,
                    fn ($q) => $q->where('id', '>', $membership->last_read_message_id),
                )
                ->count();
        }

        return $counters;
    }
}
