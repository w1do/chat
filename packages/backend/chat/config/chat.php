<?php

declare(strict_types=1);

// Конфигурация пакета vendor/chat. Приложение может опубликовать и переопределить.
return [
    'message' => [
        'max_length' => 4000,
        'edit_window_minutes' => 15,
        'page_size' => 50,
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
