<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Handlers\Queries;

use Illuminate\Support\Facades\DB;
use Vendor\Notifications\Application\DTOs\NotificationData;
use Vendor\Notifications\Application\Queries\ListNotificationsQuery;

final readonly class ListNotificationsHandler
{
    /** @return array{items: list<NotificationData>, unread: int} */
    public function handle(ListNotificationsQuery $query): array
    {
        $rows = DB::table('notifications')
            ->where('notifiable_id', $query->userId)
            ->when($query->unreadOnly, fn ($builder) => $builder->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->limit(max(1, min($query->limit, 100)))
            ->get();

        $unread = DB::table('notifications')
            ->where('notifiable_id', $query->userId)
            ->whereNull('read_at')
            ->count();

        $items = $rows->map(function (object $row): NotificationData {
            $data = json_decode((string) $row->data, true) ?: [];

            return new NotificationData(
                id: (string) $row->id,
                category: (string) ($data['category'] ?? 'message'),
                data: $data,
                groupCount: (int) $row->group_count,
                readAt: $row->read_at !== null ? (string) $row->read_at : null,
                createdAt: (string) $row->created_at,
            );
        })->values()->all();

        return ['items' => $items, 'unread' => $unread];
    }
}
