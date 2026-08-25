<?php

declare(strict_types=1);

// Конфигурация пакета vendor/identity. Приложение может опубликовать и переопределить.
return [
    // Конкретный класс пользователя подставляет приложение (STRUCTURE.md §2).
    'user_model' => null,

    // Session guard для SPA cookie auth.
    'guard' => 'web',

    // Политика паролей.
    'password' => [
        // Семейный чат, а не платёжная система: длинный пароль отпугивает тех,
        // ради кого чат и ставят. Установке, которой нужно строже, достаточно
        // поднять это значение (docs/security/hardening.md).
        'min_length' => (int) env('PASSWORD_MIN_LENGTH', 1),
    ],

    // Rate limits (попыток в минуту). Значения по умолчанию рассчитаны на
    // живых людей; установка (и E2E-стенд, где все браузеры приходят с одного
    // адреса) может поднять их окружением — docs/security/hardening.md.
    'limits' => [
        'login' => (int) env('AUTH_LOGIN_PER_MINUTE', 5),
        'register' => (int) env('AUTH_REGISTER_PER_MINUTE', 10),
        'password_reset' => (int) env('AUTH_PASSWORD_RESET_PER_MINUTE', 5),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
