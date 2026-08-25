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
        public string $kind,
        public string $authorId,
        public ?string $authorName,
        /** Мелкий размер; null — аватарки нет, рисуется буква имени. */
        public ?string $authorAvatarUrl,
        public ?string $replyToId,
        public ?string $body,
        public array $mentions,
        public ?string $editedAt,
        public bool $deleted,
        public string $createdAt,
        public array $reactions = [],
        /** @var ?array<string, mixed> */
        public ?array $payload = null,
    ) {}

    /** @param list<ReactionData> $reactions */
    public static function fromModel(Message $message, ?string $authorName = null, array $reactions = [], ?string $authorAvatarUrl = null): self
    {
        $deleted = $message->trashed();

        return new self(
            id: $message->id,
            roomId: $message->room_id,
            kind: $message->kind->value,
            authorId: $message->author_id,
            authorName: $authorName,
            authorAvatarUrl: $authorAvatarUrl,
            replyToId: $message->reply_to_id,
            // Тело удалённого сообщения не раскрывается.
            body: $deleted ? null : $message->body,
            mentions: $deleted ? [] : ($message->mentions ?? []),
            editedAt: $message->edited_at?->toIso8601String(),
            deleted: $deleted,
            createdAt: (string) $message->created_at?->toIso8601String(),
            reactions: $reactions,
            payload: $message->payload,
        );
    }
}
