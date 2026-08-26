<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Support;

use Vendor\Chat\Application\DTOs\CounterpartData;
use Vendor\Chat\Domain\Models\Room;
use Vendor\SharedKernel\Contracts\Actor;

/**
 * Собеседники диалогов одним запросом на весь список: идентификаторы берутся
 * из ключа пары без обращения к участникам, имена — через настроенный
 * auth-провайдер. Пакет chat не знает класс пользователя приложения (§4.1).
 */
final class Counterparts
{
    /**
     * @param  iterable<Room>  $rooms
     * @return array<string, CounterpartData> ключ — идентификатор переписки
     */
    public static function forRooms(iterable $rooms, string $viewerId): array
    {
        $counterpartIds = [];

        foreach ($rooms as $room) {
            $counterpartId = $room->counterpartIdFor($viewerId);

            if ($counterpartId !== null) {
                $counterpartIds[$room->id] = $counterpartId;
            }
        }

        if ($counterpartIds === []) {
            return [];
        }

        $userModel = config('auth.providers.users.model');
        $query = $userModel::query()->whereIn('id', array_unique($counterpartIds));

        // Аватарка собеседника — «лицо» диалога; подгружается тем же
        // запросом, если класс пользователя умеет медиа.
        if (method_exists($userModel, 'media')) {
            $query->with('media');
        }

        $users = $query->get()->keyBy(fn ($user): string => (string) $user->getKey());

        $result = [];

        foreach ($counterpartIds as $roomId => $userId) {
            $user = $users->get($userId);

            if ($user === null) {
                continue;
            }

            $result[$roomId] = new CounterpartData(
                id: (string) $user->getKey(),
                username: (string) $user->username,
                name: $user instanceof Actor ? $user->displayName() : (string) $user->name,
                avatarUrl: $user instanceof Actor ? $user->avatarUrl() : null,
            );
        }

        return $result;
    }
}
