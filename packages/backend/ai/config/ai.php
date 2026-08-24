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

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
