<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Vendor\Chat\Application\Support\RoomPhotoUrl;
use Vendor\Chat\Domain\Models\Room;

final readonly class RoomData
{
    public function __construct(
        public string $id,
        /** Название комнаты; у диалога названия нет — подпись даёт собеседник. */
        public ?string $name,
        public ?string $topic,
        public string $visibility,
        /** Вид переписки: room | direct. */
        public string $kind,
        public string $createdBy,
        public ?string $archivedAt,
        public string $createdAt,
        public ?string $myRole = null,
        public ?int $memberCount = null,
        public ?int $unreadCount = null,
        /** Мелкий размер для списка; null — фотографии нет, рисуется эмодзи. */
        public ?string $photoUrl = null,
        /** Крупный размер для шапки комнаты. */
        public ?string $photoLargeUrl = null,
        /** Собеседник диалога; у комнаты отсутствует. */
        public ?CounterpartData $counterpart = null,
    ) {}

    public static function fromModel(
        Room $room,
        ?string $myRole = null,
        ?int $memberCount = null,
        ?int $unreadCount = null,
        ?CounterpartData $counterpart = null,
    ): self {
        $direct = $room->isDirect();

        return new self(
            id: $room->id,
            // У диалога нет названия и описания — они отсутствуют, а не
            // подменяются пустой строкой (spec contracts/api-and-realtime).
            name: $direct ? null : $room->name,
            topic: $direct ? null : $room->topic,
            visibility: $room->visibility->value,
            kind: $room->kind->value,
            createdBy: $room->created_by,
            archivedAt: $room->archived_at?->toIso8601String(),
            createdAt: (string) $room->created_at?->toIso8601String(),
            myRole: $myRole,
            memberCount: $memberCount,
            unreadCount: $unreadCount,
            photoUrl: $direct ? $counterpart?->avatarUrl : RoomPhotoUrl::thumb($room),
            photoLargeUrl: $direct ? $counterpart?->avatarUrl : RoomPhotoUrl::large($room),
            counterpart: $direct ? $counterpart : null,
        );
    }
}
