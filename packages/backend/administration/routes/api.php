<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Маршруты пакета vendor/administration. Endpoints добавляются на этапе реализации модуля.
Route::prefix(config('administration.routes.prefix', 'api/v1'))
    ->middleware(config('administration.routes.middleware', ['api']))
    ->group(function (): void {
        // planned
    });
