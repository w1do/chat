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
        /** Мелкий размер; null — аватарки нет, рисуется буква имени. */
        public ?string $avatarUrl = null,
    ) {}

    public static function fromModel(RoomMember $member, ?string $name = null, ?string $avatarUrl = null): self
    {
        return new self(
            id: $member->id,
            roomId: $member->room_id,
            userId: $member->user_id,
            role: $member->role->value,
            joinedAt: $member->joined_at->toIso8601String(),
            name: $name,
            avatarUrl: $avatarUrl,
        );
    }
}
