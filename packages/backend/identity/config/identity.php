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
        'min_length' => 10,
    ],

    // Rate limits (попыток в минуту).
    'limits' => [
        'login' => 5,
        'register' => 10,
        'password_reset' => 5,
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
