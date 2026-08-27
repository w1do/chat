<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Support;

use DateTimeInterface;
use Illuminate\Support\Collection;
use Vendor\SharedKernel\Contracts\Actor;
use Vendor\SharedKernel\Contracts\Mentionable;
use Vendor\SharedKernel\Contracts\Present;

/**
 * Имена и аватарки авторов одним запросом. Пакет chat не знает класс
 * пользователя приложения: он берёт его из конфигурации auth-провайдера и
 * обращается только через контракт Actor (§4.1).
 */
final class AuthorDirectory
{
    /**
     * @param  iterable<string|null>  $userIds
     * @return array<string, Actor>
     */
    public static function forIds(iterable $userIds): array
    {
        $ids = Collection::make($userIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $userModel = config('auth.providers.users.model');
        $query = $userModel::query()->whereIn('id', $ids);

        // Аватарка живёт в медиа-коллекции: подгружаем её тем же запросом,
        // если класс пользователя умеет медиа. Не умеет — аватарок просто нет.
        if (method_exists($userModel, 'media')) {
            $query->with('media');
        }

        return $query->get()
            ->keyBy(fn ($user): string => (string) $user->getKey())
            ->all();
    }

    /** @param array<string, Actor> $authors */
    public static function name(array $authors, ?string $userId): ?string
    {
        return isset($authors[(string) $userId]) ? $authors[(string) $userId]->displayName() : null;
    }

    /** @param array<string, Actor> $authors */
    public static function avatar(array $authors, ?string $userId): ?string
    {
        return isset($authors[(string) $userId]) ? $authors[(string) $userId]->avatarUrl() : null;
    }

    /**
     * Ник участника — по нему строится упоминание `@username` (spec
     * chat/mention-autocomplete). Ник отдаёт контракт Mentionable: класс
     * пользователя приложения пакету по-прежнему неизвестен (§4.1).
     *
     * @param  array<string, Actor>  $authors
     */
    public static function username(array $authors, ?string $userId): ?string
    {
        $user = $authors[(string) $userId] ?? null;

        return $user instanceof Mentionable ? $user->mentionHandle() : null;
    }

    /**
     * «В сети» — там, где класс пользователя умеет присутствие; иначе его
     * просто нет, и интерфейс показывает участника без статуса (§4.1).
     *
     * @param  array<string, Actor>  $authors
     */
    public static function online(array $authors, ?string $userId): bool
    {
        $user = $authors[(string) $userId] ?? null;

        return $user instanceof Present && $user->isOnline();
    }

    /** @param array<string, Actor> $authors */
    public static function lastSeen(array $authors, ?string $userId): ?string
    {
        $user = $authors[(string) $userId] ?? null;

        return $user instanceof Present
            ? $user->lastSeenAt()?->format(DateTimeInterface::ATOM)
            : null;
    }
}
