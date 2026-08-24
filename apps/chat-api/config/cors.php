<?php

declare(strict_types=1);

// CORS: явный allowlist origin'ов SPA (CLAUDE.md §11); wildcard запрещён.
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth', 'up'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-Trace-Id', 'Idempotency-Key'],
    'exposed_headers' => ['X-Trace-Id'],
    'max_age' => 3600,
    'supports_credentials' => true,
];
