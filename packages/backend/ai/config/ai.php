<?php

declare(strict_types=1);

// Конфигурация пакета vendor/ai. Приложение может опубликовать и переопределить.
return [
    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
