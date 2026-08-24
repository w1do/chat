<?php

declare(strict_types=1);

namespace Tests\Support;

use Vendor\Chat\Domain\Contracts\PresenceRegistry;

/** In-memory реестр для тестов без Redis. */
final class FakePresenceRegistry implements PresenceRegistry
{
    /** @var array<string, array<string, true>> */
    private array $active = [];

    /** @var array<string, array<string, true>> */
    private array $typing = [];

    public function markActive(string $roomId, string $userId, int $ttlSeconds = 60): void
    {
        $this->active[$roomId][$userId] = true;
    }

    public function markInactive(string $roomId, string $userId): void
    {
        unset($this->active[$roomId][$userId]);
    }

    public function isActiveInRoom(string $roomId, string $userId): bool
    {
        return isset($this->active[$roomId][$userId]);
    }

    public function activeUserIds(string $roomId): array
    {
        return array_keys($this->active[$roomId] ?? []);
    }

    public function markTyping(string $roomId, string $userId, int $ttlSeconds = 7): void
    {
        $this->typing[$roomId][$userId] = true;
    }

    public function stopTyping(string $roomId, string $userId): void
    {
        unset($this->typing[$roomId][$userId]);
    }

    public function typingUserIds(string $roomId): array
    {
        return array_keys($this->typing[$roomId] ?? []);
    }
}
