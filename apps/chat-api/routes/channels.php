<?php

declare(strict_types=1);

// Авторизация приватных и presence каналов. Правила требуют знания обо всех
// модулях сразу, поэтому живут в composition root (STRUCTURE.md §2).
// Payload события содержит только данные, доступные пользователю через API.

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Vendor\Chat\Domain\Models\Room;

// Приватный канал комнаты: только участники.
Broadcast::channel('room.{roomId}', function (User $user, string $roomId): bool {
    return Room::query()->whereKey($roomId)->first()?->hasMember($user) ?? false;
});

// Presence-канал комнаты (typing/присутствие): участники, payload — id и имя.
Broadcast::channel('room.{roomId}.presence', function (User $user, string $roomId): array|false {
    $isMember = Room::query()->whereKey($roomId)->first()?->hasMember($user) ?? false;

    if (! $isMember) {
        return false;
    }

    return ['id' => $user->externalId(), 'name' => $user->displayName()];
});

// Приватный канал пользователя: доставка его уведомлений (этап 8).
Broadcast::channel('user.{userId}', function (User $user, string $userId): bool {
    return $user->externalId() === $userId;
});
