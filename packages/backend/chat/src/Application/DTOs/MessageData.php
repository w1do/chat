<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Vendor\Chat\Domain\Models\Message;

final readonly class MessageData
{
    /**
     * @param  list<string>  $mentions
     * @param  list<ReactionData>  $reactions
     */
    public function __construct(
        public string $id,
        public string $roomId,
        public string $authorId,
        public ?string $authorName,
        public ?string $replyToId,
        public ?string $body,
        public array $mentions,
        public ?string $editedAt,
        public bool $deleted,
        public string $createdAt,
        public array $reactions = [],
    ) {}

    /** @param list<ReactionData> $reactions */
    public static function fromModel(Message $message, ?string $authorName = null, array $reactions = []): self
    {
        $deleted = $message->trashed();

        return new self(
            id: $message->id,
            roomId: $message->room_id,
            authorId: $message->author_id,
            authorName: $authorName,
            replyToId: $message->reply_to_id,
            // Тело удалённого сообщения не раскрывается.
            body: $deleted ? null : $message->body,
            mentions: $deleted ? [] : ($message->mentions ?? []),
            editedAt: $message->edited_at?->toIso8601String(),
            deleted: $deleted,
            createdAt: (string) $message->created_at?->toIso8601String(),
            reactions: $reactions,
        );
    }
}
