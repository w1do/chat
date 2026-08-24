<?php

declare(strict_types=1);

use App\Http\Middleware\ApplyRuntimeSettings;
use App\Support\ApiErrorEnvelope;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum cookie SPA auth: stateful-запросы фронтенда проходят
        // session/CSRF стек (ADR-005).
        $middleware->statefulApi();

        // Выключатели администратора применяются к каждому запросу API.
        $middleware->appendToGroup('api', ApplyRuntimeSettings::class);

        // Reverse proxy стека (ADR-007) — явный allowlist через env.
        $middleware->trustProxies(at: array_values(array_filter(
            explode(',', (string) env('TRUSTED_PROXIES', '')),
        )));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API всегда отвечает JSON, включая исключения (docs/api/error-envelope.md).
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiErrorEnvelope::fromThrowable($e, $request);
            }

            return null;
        });
    })->create();
