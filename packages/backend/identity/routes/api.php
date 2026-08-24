<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Маршруты пакета vendor/identity. Endpoints добавляются на этапе реализации модуля.
Route::prefix(config('identity.routes.prefix', 'api/v1'))
    ->middleware(config('identity.routes.middleware', ['api']))
    ->group(function (): void {
        // planned
    });
