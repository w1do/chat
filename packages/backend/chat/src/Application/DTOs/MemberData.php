<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Vendor\Chat\Domain\Models\RoomMember;

final readonly class MemberData
{
    public function __construct(
        public string $id,
        public string $roomId,
        public string $userId,
        public string $role,
        public string $joinedAt,
        public ?string $name = null,
        /** Ник для упоминания `@username`; null — у модели ника нет. */
        public ?string $username = null,
        /** Мелкий размер; null — аватарки нет, рисуется буква имени. */
        public ?string $avatarUrl = null,
        /** Активность была не давнее окна присутствия. */
        public bool $isOnline = false,
        /** Момент последней активности; null — неизвестен. */
        public ?string $lastSeenAt = null,
    ) {}

    public static function fromModel(
        RoomMember $member,
        ?string $name = null,
        ?string $username = null,
        ?string $avatarUrl = null,
        bool $isOnline = false,
        ?string $lastSeenAt = null,
    ): self {
        return new self(
            id: $member->id,
            roomId: $member->room_id,
            userId: $member->user_id,
            role: $member->role->value,
            joinedAt: $member->joined_at->toIso8601String(),
            name: $name,
            username: $username,
            avatarUrl: $avatarUrl,
            isOnline: $isOnline,
            lastSeenAt: $lastSeenAt,
        );
    }
}
