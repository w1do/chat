<?php

declare(strict_types=1);

// Конфигурация пакета vendor/notifications.
return [
    // Каналы по умолчанию для каждой категории, пока пользователь не менял настройки.
    'defaults' => [
        'message' => ['database' => true, 'mail' => false, 'push' => true],
        'mention' => ['database' => true, 'mail' => true, 'push' => true],
        'room_invite' => ['database' => true, 'mail' => true, 'push' => true],
        // Безопасность: лента включена всегда, push — по желанию.
        'security' => ['database' => true, 'mail' => true, 'push' => true],
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

    // Web Push: ключи VAPID генерируются командой `chat:push-keys` и живут в
    // окружении. Без них push просто выключен — остальные каналы работают.
    'push' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        // Контакт администратора установки: его требует спецификация VAPID.
        'subject' => env('VAPID_SUBJECT', env('APP_URL', 'https://example.com')),
        'ttl_seconds' => (int) env('PUSH_TTL_SECONDS', 1800),
        // Длина фрагмента сообщения в уведомлении на экране блокировки.
        'preview_length' => (int) env('PUSH_PREVIEW_LENGTH', 120),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
