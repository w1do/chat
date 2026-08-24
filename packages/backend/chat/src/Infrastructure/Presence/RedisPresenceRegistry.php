<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Presence;

use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Illuminate\Redis\Connections\Connection;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;

/**
 * Redis-реестр присутствия: sorted set на комнату, score — момент истечения.
 * Просроченные записи вычищаются при каждом чтении/записи (disconnect без
 * явного ухода истекает по TTL).
 */
final readonly class RedisPresenceRegistry implements PresenceRegistry
{
    public function __construct(
        private RedisFactory $redis,
        private string $prefix = 'chat:presence',
    ) {}

    public function markActive(string $roomId, string $userId, int $ttlSeconds = 60): void
    {
        $this->add($this->activeKey($roomId), $userId, $ttlSeconds);
    }

    public function markInactive(string $roomId, string $userId): void
    {
        $this->connection()->zrem($this->activeKey($roomId), $userId);
    }

    public function isActiveInRoom(string $roomId, string $userId): bool
    {
        // zscore возвращает score либо false/null в зависимости от клиента.
        $score = $this->connection()->zscore($this->activeKey($roomId), $userId);

        return is_numeric($score) && (float) $score > microtime(true);
    }

    public function activeUserIds(string $roomId): array
    {
        return $this->liveMembers($this->activeKey($roomId));
    }

    public function markTyping(string $roomId, string $userId, int $ttlSeconds = 7): void
    {
        $this->add($this->typingKey($roomId), $userId, $ttlSeconds);
    }

    public function stopTyping(string $roomId, string $userId): void
    {
        $this->connection()->zrem($this->typingKey($roomId), $userId);
    }

    public function typingUserIds(string $roomId): array
    {
        return $this->liveMembers($this->typingKey($roomId));
    }

    private function add(string $key, string $userId, int $ttlSeconds): void
    {
        $connection = $this->connection();
        $connection->zadd($key, [$userId => microtime(true) + $ttlSeconds]);
        // Ключ комнаты живёт дольше самой длинной записи — мусор не копится.
        $connection->expire($key, max($ttlSeconds * 2, 300));
        $connection->zremrangebyscore($key, '-inf', (string) microtime(true));
    }

    /** @return list<string> */
    private function liveMembers(string $key): array
    {
        $connection = $this->connection();
        $connection->zremrangebyscore($key, '-inf', (string) microtime(true));

        /** @var list<string> */
        return array_values($connection->zrangebyscore($key, (string) microtime(true), '+inf'));
    }

    private function connection(): Connection
    {
        return $this->redis->connection();
    }

    private function activeKey(string $roomId): string
    {
        return "{$this->prefix}:active:{$roomId}";
    }

    private function typingKey(string $roomId): string
    {
        return "{$this->prefix}:typing:{$roomId}";
    }
}
