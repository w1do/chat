<?php

declare(strict_types=1);

// Конфигурация пакета vendor/notifications.
return [
    // Каналы по умолчанию для каждой категории, пока пользователь не менял настройки.
    'defaults' => [
        'message' => ['database' => true, 'mail' => false],
        'mention' => ['database' => true, 'mail' => true],
        'room_invite' => ['database' => true, 'mail' => true],
        // Безопасность: лента включена всегда.
        'security' => ['database' => true, 'mail' => true],
    ],

    // Окна группировки шумных событий, в секундах.
    'grouping' => [
        'message' => (int) env('NOTIFY_GROUP_MESSAGE_SECONDS', 900),
        'mention' => (int) env('NOTIFY_GROUP_MENTION_SECONDS', 300),
    ],

    'queues' => [
        'critical' => 'notifications-critical',
        'default' => 'notifications',
        'bulk' => 'notifications-bulk',
    ],

    'jobs' => [
        'tries' => (int) env('NOTIFY_JOB_TRIES', 3),
        // job timeout < horizon supervisor timeout < queue retry_after (CLAUDE.md §14).
        'timeout' => (int) env('NOTIFY_JOB_TIMEOUT', 30),
        'backoff' => [10, 60, 300],
        // Замок от дублей при сетевых повторах.
        'unique_seconds' => (int) env('NOTIFY_JOB_UNIQUE_SECONDS', 120),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
