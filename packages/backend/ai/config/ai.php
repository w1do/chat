<?php

declare(strict_types=1);

// Конфигурация пакета vendor/ai. Значения читаются только здесь: в прикладных
// классах env() не вызывается (CLAUDE.md §12).
return [
    // Выключатель администратора: без него чат работает как обычно.
    'enabled' => (bool) env('AI_ENABLED', false),

    'provider' => env('AI_PROVIDER', 'null'),

    'providers' => [
        'polza' => [
            // OpenAI-совместимый API Polza.
            'base_url' => env('AI_BASE_URL', 'https://polza.ai/api/v1'),
            'api_key' => env('AI_API_KEY'),
            'model' => env('AI_MODEL', 'openai/gpt-4o-mini'),
        ],
    ],

    'limits' => [
        'max_input_length' => (int) env('AI_MAX_INPUT_LENGTH', 2000),
        'timeout_seconds' => (int) env('AI_TIMEOUT_SECONDS', 20),
        'retries' => (int) env('AI_RETRIES', 1),
        // Запросов в час на пользователя.
        'per_user_hourly' => (int) env('AI_PER_USER_HOURLY', 60),
        // Запросов в минуту на пользователя.
        'per_user_minute' => (int) env('AI_PER_USER_MINUTE', 6),
    ],

    // Размыкание цепи при череде отказов поставщика.
    'circuit_breaker' => [
        'failures_before_open' => (int) env('AI_BREAKER_FAILURES', 5),
        'open_seconds' => (int) env('AI_BREAKER_OPEN_SECONDS', 60),
    ],

    // Цены за 1000 токенов в валюте поставщика; используются для аудита.
    'pricing' => [
        'prompt_per_1k' => (float) env('AI_PRICE_PROMPT_PER_1K', 0.0),
        'completion_per_1k' => (float) env('AI_PRICE_COMPLETION_PER_1K', 0.0),
    ],

    // Пересказ приложенного документа по ответу с «@ai» (spec ai/file-summary).
    'file_summary' => [
        // Токен-триггер в черновике ответа; проверяется и на сервере.
        'trigger' => env('AI_SUMMARY_TRIGGER', '@ai'),

        // Предел размера файла: крупный документ отклоняется до поставщика.
        'max_file_size_kb' => (int) env('AI_SUMMARY_MAX_FILE_KB', 5120),

        // Сколько символов извлечённого текста уходит поставщику.
        'max_document_characters' => (int) env('AI_SUMMARY_MAX_DOCUMENT_CHARS', 24000),

        // Готовый пересказ обрезается до этого окна с сохранением предложений.
        'min_length' => (int) env('AI_SUMMARY_MIN_LENGTH', 500),
        'max_length' => (int) env('AI_SUMMARY_MAX_LENGTH', 800),

        // Вступление перед пересказом (spec: draft with a short lead-in).
        'lead_in' => env('AI_SUMMARY_LEAD_IN', 'Вот что:'),

        // Языки, на которых поставщик отвечает; остальное — английский.
        'locales' => ['ru', 'en'],
        'fallback_locale' => 'en',

        // Расширение → допустимые MIME фактического содержимого. Уже, чем
        // белый список вложений: пересказываем только документы.
        'types' => [
            'pdf' => ['application/pdf'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
            'txt' => ['text/plain'],
        ],

        // Квота на установку (один проект = одна установка, CLAUDE.md §2).
        'per_install_hourly' => (int) env('AI_SUMMARY_PER_INSTALL_HOURLY', 200),
        // Квота на пользователя: отдельная от правки черновика.
        'per_user_hourly' => (int) env('AI_SUMMARY_PER_USER_HOURLY', 20),

        'queue' => env('AI_SUMMARY_QUEUE', 'ai'),
        'job' => [
            'tries' => (int) env('AI_SUMMARY_JOB_TRIES', 2),
            // Цепочка таймаутов (CLAUDE.md §14): таймаут поставщика (40) <
            // timeout задания (50) < timeout супервизора Horizon (60) <
            // retry_after очереди (90).
            'timeout' => (int) env('AI_SUMMARY_JOB_TIMEOUT', 50),
            'backoff' => [15, 60],
        ],
        // Таймаут обращения к поставщику: документ обрабатывается дольше
        // правки, но должен уложиться внутрь timeout задания.
        'timeout_seconds' => (int) env('AI_SUMMARY_TIMEOUT_SECONDS', 40),
        // Сколько черновик доступен для публикации после готовности.
        'draft_ttl_hours' => (int) env('AI_SUMMARY_DRAFT_TTL_HOURS', 24),
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
