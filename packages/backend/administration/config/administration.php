<?php

declare(strict_types=1);

// Конфигурация пакета vendor/administration. Приложение может опубликовать и переопределить.
return [
    'version' => env('APP_VERSION', '0.1.0'),

    // Кэш настроек: значение читается на каждый запрос.
    'settings_cache_ttl' => (int) env('ADMIN_SETTINGS_TTL', 60),

    'audit' => [
        // Длина строки в контексте, после которой значение обрезается.
        'max_context_string' => (int) env('ADMIN_AUDIT_MAX_STRING', 200),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
