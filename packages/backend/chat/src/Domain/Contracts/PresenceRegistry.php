<?php

declare(strict_types=1);

namespace Vendor\Chat\Domain\Contracts;

/**
 * Источник истины «кто сейчас активен в комнате» (design, допущение 6):
 * Reverb presence-каналы подпитывают реестр, но авторитет — он.
 * Используется правилом «не уведомлять активного в комнате» (этап 8).
 */
interface PresenceRegistry
{
    public function markActive(string $roomId, string $userId, int $ttlSeconds = 60): void;

    public function markInactive(string $roomId, string $userId): void;

    public function isActiveInRoom(string $roomId, string $userId): bool;

    /** @return list<string> */
    public function activeUserIds(string $roomId): array;

    public function markTyping(string $roomId, string $userId, int $ttlSeconds = 7): void;

    public function stopTyping(string $roomId, string $userId): void;

    /** @return list<string> */
    public function typingUserIds(string $roomId): array;
}
