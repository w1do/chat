<?php

declare(strict_types=1);

// Конфигурация пакета vendor/chat. Приложение может опубликовать и переопределить.
return [
    'message' => [
        'max_length' => 4000,
        'edit_window_minutes' => 15,
        'page_size' => 50,
    ],

    'presence' => [
        'active_ttl_seconds' => 60,
        'typing_ttl_seconds' => 7,
    ],

    // Поиск по истории: PostgreSQL остаётся источником истины, индекс
    // перестраиваем командой. Значения читаются только здесь (CLAUDE.md §12).
    'search' => [
        'enabled' => (bool) env('SEARCH_ENABLED', false),
        'driver' => env('SEARCH_DRIVER', 'typesense'),
        'collection' => env('SEARCH_COLLECTION', 'messages'),
        'host' => env('TYPESENSE_HOST', '127.0.0.1'),
        'port' => (int) env('TYPESENSE_PORT', 8108),
        'protocol' => env('TYPESENSE_PROTOCOL', 'http'),
        'api_key' => env('TYPESENSE_API_KEY'),
        'timeout_seconds' => (int) env('SEARCH_TIMEOUT_SECONDS', 3),
        'page_size' => (int) env('SEARCH_PAGE_SIZE', 20),
        'queue' => env('SEARCH_QUEUE', 'search'),
        'job' => [
            'tries' => (int) env('SEARCH_JOB_TRIES', 3),
            'timeout' => (int) env('SEARCH_JOB_TIMEOUT', 20),
            'backoff' => [10, 60, 300],
        ],
    ],

    // Ссылки-приглашения в комнату.
    'invites' => [
        'lifetime_days' => (int) env('INVITE_LIFETIME_DAYS', 7),
        'create_per_minute' => (int) env('INVITE_CREATE_PER_MINUTE', 10),
        'lookup_per_minute' => (int) env('INVITE_LOOKUP_PER_MINUTE', 20),
        'accept_per_minute' => (int) env('INVITE_ACCEPT_PER_MINUTE', 10),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
