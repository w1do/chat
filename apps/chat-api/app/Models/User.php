<?php

declare(strict_types=1);

namespace App\Models;

use Spatie\Permission\Traits\HasRoles;
use Vendor\Identity\Domain\Models\User as BaseUser;

/**
 * Конкретная модель пользователя приложения. Пакеты не знают этот класс:
 * он подставляется через config('identity.user_model') (STRUCTURE.md §2).
 */
class User extends BaseUser
{
    // Роли и права — spatie/laravel-permission; teams не используются:
    // в продукте нет второго измерения владения (ADR-010).
    use HasRoles;

    /**
     * Роли и права хранятся под guard `web`: API ходит через sanctum, но
     * это тот же провайдер пользователей, и раздваивать наборы прав незачем.
     */
    public const GUARD = 'web';

    protected string $guard_name = self::GUARD;
}
