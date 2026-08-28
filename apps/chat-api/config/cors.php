<?php

declare(strict_types=1);

// CORS: явный allowlist origin'ов SPA (CLAUDE.md §11); wildcard запрещён.
return [
    'paths' => ['api/*', 'broadcasting/auth', 'up'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-Trace-Id', 'Idempotency-Key'],
    'exposed_headers' => ['X-Trace-Id'],
    'max_age' => 3600,
    // Cookie в схеме нет: клиент представляется заголовком Authorization
    // (ADR-012), поэтому браузеру не нужно разрешать credentials.
    'supports_credentials' => false,
];
