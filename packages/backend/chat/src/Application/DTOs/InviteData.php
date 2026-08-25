<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

use Vendor\Chat\Domain\Models\RoomInvite;

/**
 * Приглашение наружу. Токен присутствует только сразу после создания: потом
 * его негде взять — в базе лежит лишь хэш.
 */
final readonly class InviteData
{
    public function __construct(
        public string $id,
        public string $roomId,
        public string $roomName,
        public ?string $invitedByName,
        public string $expiresAt,
        public ?string $token = null,
    ) {}

    public static function fromModel(RoomInvite $invite, ?string $roomName = null, ?string $invitedByName = null, ?string $token = null): self
    {
        return new self(
            id: $invite->id,
            roomId: $invite->room_id,
            roomName: $roomName ?? $invite->room->name,
            invitedByName: $invitedByName,
            expiresAt: $invite->expires_at->toIso8601String(),
            token: $token,
        );
    }
}
