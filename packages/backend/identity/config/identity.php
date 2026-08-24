<?php

declare(strict_types=1);

// Конфигурация пакета vendor/identity. Приложение может опубликовать и переопределить.
return [
    // Конкретный класс пользователя подставляет приложение (см. STRUCTURE.md §2).
    'user_model' => null,

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
