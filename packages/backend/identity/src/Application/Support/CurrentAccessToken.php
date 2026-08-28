<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Support;

use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Идентификатор токена, которым выполнен запрос. Нужен операциям, которые
 * отзывают токены и обязаны пощадить текущий: выход и смена пароля.
 * Значения нет, когда пользователь пришёл не по токену (тестовый
 * `actingAs`, first-party режим Sanctum) — тогда щадить нечего.
 */
final class CurrentAccessToken
{
    public static function id(Request $request): ?int
    {
        $token = $request->user()?->currentAccessToken();

        return $token instanceof PersonalAccessToken ? (int) $token->getKey() : null;
    }
}
