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

    // Фотография комнаты (ADR-011): хранится только подготовленной в webp.
    'images' => [
        'max_size_kb' => (int) env('ROOM_IMAGE_MAX_KB', 8192),
        'photo' => ['large' => 512, 'thumb' => 128],
        'per_minute' => (int) env('ROOM_IMAGE_PER_MINUTE', 20),
    ],

    // Вложения к сообщениям (spec chat/attachments): файлы живут в объектном
    // хранилище под uploads/, принимаются только из белого списка ниже.
    'attachments' => [
        'max_files' => (int) env('ATTACHMENT_MAX_FILES', 10),
        'max_size_kb' => (int) env('ATTACHMENT_MAX_KB', 25600),
        'per_minute' => (int) env('ATTACHMENT_PER_MINUTE', 30),
        // Загруженное, но не отправленное убирается по расписанию.
        'unsent_ttl_hours' => (int) env('ATTACHMENT_UNSENT_TTL_HOURS', 24),
        // Один размер миниатюры с запасом под плотный экран (design 5).
        'thumb' => (int) env('ATTACHMENT_THUMB', 640),

        // До какого размера файла миниатюра готовится прямо при загрузке:
        // типовой снимок отдаётся уже с адресом миниатюры, тяжёлый уходит в
        // очередь media, чтобы пачка фотографий не задерживала отправку.
        'preview_sync_max_kb' => (int) env('ATTACHMENT_PREVIEW_SYNC_MAX_KB', 4096),

        // Сужение белого списка без правки карты типов: перечень расширений
        // через запятую (ATTACHMENT_EXTENSIONS=jpg,png,pdf). Пусто — весь список.
        'extensions' => env('ATTACHMENT_EXTENSIONS'),

        // Белый список: расширение → допустимые MIME фактического содержимого.
        // Файл принимается, только когда совпали оба (design 6). Форматы
        // office/odf распознаются finfo и как zip — это их контейнер.
        'types' => [
            // Изображения
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'webp' => ['image/webp'],
            'bmp' => ['image/bmp', 'image/x-ms-bmp'],
            'heic' => ['image/heic', 'image/heif'],
            // Видео
            'mp4' => ['video/mp4'],
            'mov' => ['video/quicktime'],
            'webm' => ['video/webm'],
            'mkv' => ['video/x-matroska', 'application/x-matroska'],
            // Аудио
            'mp3' => ['audio/mpeg'],
            'ogg' => ['audio/ogg', 'application/ogg'],
            'wav' => ['audio/wav', 'audio/x-wav'],
            'm4a' => ['audio/mp4', 'audio/x-m4a'],
            'flac' => ['audio/flac', 'audio/x-flac'],
            // PDF и документы
            'pdf' => ['application/pdf'],
            'doc' => ['application/msword', 'application/vnd.ms-office', 'application/CDFV2'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
            'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/CDFV2'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
            'ppt' => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/CDFV2'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
            'odt' => ['application/vnd.oasis.opendocument.text', 'application/zip'],
            'ods' => ['application/vnd.oasis.opendocument.spreadsheet', 'application/zip'],
            'odp' => ['application/vnd.oasis.opendocument.presentation', 'application/zip'],
            // Тексты
            'txt' => ['text/plain'],
            'md' => ['text/plain', 'text/markdown'],
            'csv' => ['text/plain', 'text/csv'],
            'rtf' => ['application/rtf', 'text/rtf'],
            // Архивы
            'zip' => ['application/zip'],
            'rar' => ['application/x-rar', 'application/x-rar-compressed', 'application/vnd.rar'],
            '7z' => ['application/x-7z-compressed'],
            'gz' => ['application/gzip', 'application/x-gzip'],
            'tar' => ['application/x-tar'],
        ],

        // Исполняемое и скрипты отклоняются всегда — поверх белого списка
        // (design 6): защита и от ошибочно расширенной карты типов выше.
        'forbidden_extensions' => [
            'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'dll', 'msc', 'cpl', 'reg',
            'sh', 'bash', 'zsh', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta',
            'apk', 'app', 'dmg', 'deb', 'rpm', 'jar', 'php', 'phar', 'py', 'rb', 'pl', 'cgi',
        ],
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
