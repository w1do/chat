<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\Queries\SearchMessagesQuery;
use Vendor\Chat\Application\Support\AuthorDirectory;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\RoomMember;

/**
 * Поиск ограничен комнатами, в которых состоит спрашивающий: список комнат
 * приходит из PostgreSQL, индекс отвечает только идентификаторами, а тела
 * сообщений дочитываются из базы — источника истины.
 */
final readonly class SearchMessagesHandler
{
    public function __construct(private MessageIndex $index) {}

    /** @return list<MessageData> */
    public function handle(SearchMessagesQuery $query, string $viewerId): array
    {
        $term = trim($query->term);

        if ($term === '') {
            return [];
        }

        $roomIds = $this->accessibleRoomIds($viewerId, $query->roomId);

        if ($roomIds === []) {
            return [];
        }

        $limit = max(1, min($query->limit, 50));
        $ids = $this->index->search($term, $roomIds, $limit);

        if ($ids === []) {
            return [];
        }

        // Удалённые и системные записи не выдаём, даже если индекс отстал.
        $messages = Message::query()
            ->with('media')
            ->whereIn('id', $ids)
            ->whereIn('room_id', $roomIds)
            ->where('kind', 'text')
            ->get()
            ->keyBy('id');

        $authors = AuthorDirectory::forIds($messages->pluck('author_id'));

        $ordered = [];

        foreach ($ids as $id) {
            $message = $messages->get($id);

            if ($message === null) {
                continue;
            }

            $ordered[] = MessageData::fromModel(
                $message,
                authorName: AuthorDirectory::name($authors, $message->author_id),
                authorAvatarUrl: AuthorDirectory::avatar($authors, $message->author_id),
            );
        }

        return $ordered;
    }

    /** @return list<string> */
    private function accessibleRoomIds(string $viewerId, ?string $roomId): array
    {
        return RoomMember::query()
            ->where('user_id', $viewerId)
            ->when($roomId !== null, fn ($q) => $q->where('room_id', $roomId))
            ->pluck('room_id')
            ->values()
            ->all();
    }
}
