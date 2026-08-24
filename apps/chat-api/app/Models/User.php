<?php

declare(strict_types=1);

namespace App\Models;

use Vendor\Identity\Domain\Models\User as BaseUser;

/**
 * Конкретная модель пользователя приложения. Пакеты не знают этот класс:
 * он подставляется через config('identity.user_model') (STRUCTURE.md §2).
 */
class User extends BaseUser {}
