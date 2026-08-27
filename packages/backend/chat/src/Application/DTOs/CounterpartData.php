<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\DTOs;

/**
 * Собеседник диалога: ровно то, что нужно клиенту, чтобы подписать переписку
 * и открыть её — идентификатор, ник и отображаемое имя. Имя не хранится в
 * диалоге, а подставляется при чтении (design 5).
 */
final readonly class CounterpartData
{
    public function __construct(
        public string $id,
        public string $username,
        public string $name,
        /** Аватарка собеседника — она же «фотография» диалога; null — буква имени. */
        public ?string $avatarUrl = null,
        /** Активность была не давнее окна присутствия. */
        public bool $isOnline = false,
        /** Момент последней активности собеседника; null — неизвестен. */
        public ?string $lastSeenAt = null,
    ) {}
}
