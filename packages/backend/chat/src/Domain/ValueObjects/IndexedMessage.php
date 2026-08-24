<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\ValueObjects;

use Vendor\Chat\Domain\Models\Message;

/**
 * Документ индекса. Только безопасные поля: ни имён, ни почты, ни названия
 * комнаты — всё остальное дочитывается из PostgreSQL после проверки прав.
 */
final readonly class IndexedMessage
{
    public function __construct(
        public string $id,
        public string $roomId,
        public string $authorId,
        public string $body,
        public int $createdAt,
    ) {}

    public static function fromModel(Message $message): self
    {
        return new self(
            id: $message->id,
            roomId: $message->room_id,
            authorId: $message->author_id,
            body: (string) $message->body,
            createdAt: (int) ($message->created_at?->getTimestamp() ?? 0),
        );
    }

    /** @return array<string, mixed> */
    public function toDocument(): array
    {
        return [
            'id' => $this->id,
            'room_id' => $this->roomId,
            'author_id' => $this->authorId,
            'body' => $this->body,
            'created_at' => $this->createdAt,
        ];
    }
}
