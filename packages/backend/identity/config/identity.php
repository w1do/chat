<?php

declare(strict_types=1);

// Конфигурация пакета vendor/identity. Приложение может опубликовать и переопределить.
return [
    // Конкретный класс пользователя подставляет приложение (STRUCTURE.md §2).
    'user_model' => null,

    // Session guard для SPA cookie auth.
    'guard' => 'web',

    // Политика паролей.
    'password' => [
        // Семейный чат, а не платёжная система: длинный пароль отпугивает тех,
        // ради кого чат и ставят. Установке, которой нужно строже, достаточно
        // поднять это значение (docs/security/hardening.md).
        'min_length' => (int) env('PASSWORD_MIN_LENGTH', 1),
    ],

    // Rate limits (попыток в минуту). Значения по умолчанию рассчитаны на
    // живых людей; установка (и E2E-стенд, где все браузеры приходят с одного
    // адреса) может поднять их окружением — docs/security/hardening.md.
    'limits' => [
        'login' => (int) env('AUTH_LOGIN_PER_MINUTE', 5),
        'register' => (int) env('AUTH_REGISTER_PER_MINUTE', 10),
        'password_reset' => (int) env('AUTH_PASSWORD_RESET_PER_MINUTE', 5),
        'images' => (int) env('PROFILE_IMAGE_PER_MINUTE', 20),
    ],

    // Присутствие: «в сети», пока активность была не давнее окна; запись в
    // базу троттлится, чтобы каждый запрос не превращался в UPDATE.
    'presence' => [
        'online_window_seconds' => (int) env('PRESENCE_ONLINE_WINDOW_SECONDS', 120),
        'touch_throttle_seconds' => (int) env('PRESENCE_TOUCH_THROTTLE_SECONDS', 60),
    ],

    'browser_token' => [
        'enabled' => (bool) env('AUTH_BROWSER_TOKEN_ENABLED', true),
        'cookie' => env('AUTH_BROWSER_TOKEN_COOKIE', '__Host-chat_browser_token'),
        'ability' => env('AUTH_BROWSER_TOKEN_ABILITY', 'browser'),
        'ttl_minutes' => (int) env('AUTH_BROWSER_TOKEN_TTL_MINUTES', 1440),
        'remember_ttl_minutes' => (int) env('AUTH_BROWSER_TOKEN_REMEMBER_TTL_MINUTES', 43200),
        'secure' => (bool) env('AUTH_BROWSER_TOKEN_SECURE', env('APP_ENV') === 'production'),
        'same_site' => env('AUTH_BROWSER_TOKEN_SAME_SITE', 'lax'),
        'path' => '/',
        'domain' => env('AUTH_BROWSER_TOKEN_DOMAIN'),
    ],

    // Изображения профиля: аватарки и обои (ADR-011). Хранятся только
    // подготовленными в webp — исходник в бакет не попадает.
    'images' => [
        // Предел размера принимаемого файла, килобайты.
        'max_size_kb' => (int) env('PROFILE_IMAGE_MAX_KB', 8192),
        // Сколько аватарок человек держит в своём наборе.
        'max_avatars' => (int) env('PROFILE_MAX_AVATARS', 12),
        // Крупный размер — экран профиля и шапка; мелкий — списки и ленты.
        'avatar' => ['large' => 512, 'thumb' => 128],
        // Обои разворачиваются на весь экран телефона с запасом под плотность.
        'wallpaper' => ['width' => 1440, 'height' => 2560],
    ],

    'routes' => [
        'enabled' => true,
        'prefix' => 'api/v1',
        'middleware' => ['api'],
    ],
];
