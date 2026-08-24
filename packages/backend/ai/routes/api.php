<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Маршруты пакета vendor/ai. Endpoints добавляются на этапе реализации модуля.
Route::prefix(config('ai.routes.prefix', 'api/v1'))
    ->middleware(config('ai.routes.middleware', ['api']))
    ->group(function (): void {
        // planned
    });
