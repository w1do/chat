<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Queries;

use Illuminate\Support\Collection;
use Vendor\Chat\Application\DTOs\CursorPage;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\DTOs\ReactionData;
use Vendor\Chat\Application\Queries\ListMessagesQuery;
use Vendor\Chat\Application\Support\AuthorDirectory;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;
use Vendor\Chat\Domain\ValueObjects\MessageCursor;

final readonly class ListMessagesHandler
{
    public function handle(ListMessagesQuery $query, string $viewerId): CursorPage
    {
        $cursor = MessageCursor::fromString($query->cursor);
        $limit = max(1, min($query->limit, 100));

        // Новые → старые; ULID id задаёт стабильный порядок. Soft-deleted
        // строки включаются: история сохраняет позиции и связи ответов.
        $messages = Message::query()
            ->withTrashed()
            // Вложения — без N+1: медиа всех сообщений одним запросом.
            ->with('media')
            ->where('room_id', $query->roomId)
            ->when(! $cursor->isStart(), fn ($q) => $q->where('id', '<', $cursor->beforeId))
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $messages->count() > $limit;
        $messages = $messages->take($limit);

        $authors = AuthorDirectory::forIds($messages->pluck('author_id'));
        $reactions = $this->reactionsFor($messages->pluck('id')->all(), $viewerId);

        $items = $messages->map(fn (Message $message): MessageData => MessageData::fromModel(
            $message,
            authorName: AuthorDirectory::name($authors, $message->author_id),
            reactions: $reactions[$message->id] ?? [],
            authorAvatarUrl: AuthorDirectory::avatar($authors, $message->author_id),
        ))->values()->all();

        return new CursorPage(
            items: $items,
            nextCursor: $hasMore ? $messages->last()?->id : null,
        );
    }

    /**
     * @param  list<string>  $messageIds
     * @return array<string, list<ReactionData>>
     */
    private function reactionsFor(array $messageIds, string $viewerId): array
    {
        if ($messageIds === []) {
            return [];
        }

        $rows = MessageReaction::query()
            ->whereIn('message_id', $messageIds)
            ->get()
            ->groupBy('message_id');

        $result = [];
        foreach ($rows as $messageId => $reactions) {
            $result[(string) $messageId] = $reactions
                ->groupBy('emoji')
                ->map(fn (Collection $group, string $emoji): ReactionData => new ReactionData(
                    emoji: $emoji,
                    count: $group->count(),
                    reactedByMe: $group->contains(fn (MessageReaction $r): bool => $r->user_id === $viewerId),
                ))
                ->values()
                ->all();
        }

        return $result;
    }
}
