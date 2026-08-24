<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Vendor\Chat\Domain\Models\Room;

final readonly class RoomData
{
    public function __construct(
        public string $id,
        public string $name,
        public ?string $topic,
        public string $visibility,
        public string $createdBy,
        public ?string $archivedAt,
        public string $createdAt,
        public ?string $myRole = null,
        public ?int $memberCount = null,
        public ?int $unreadCount = null,
    ) {}

    public static function fromModel(
        Room $room,
        ?string $myRole = null,
        ?int $memberCount = null,
        ?int $unreadCount = null,
    ): self {
        return new self(
            id: $room->id,
            name: $room->name,
            topic: $room->topic,
            visibility: $room->visibility->value,
            createdBy: $room->created_by,
            archivedAt: $room->archived_at?->toIso8601String(),
            createdAt: (string) $room->created_at?->toIso8601String(),
            myRole: $myRole,
            memberCount: $memberCount,
            unreadCount: $unreadCount,
        );
    }
}
