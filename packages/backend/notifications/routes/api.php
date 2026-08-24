<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Маршруты пакета vendor/notifications. Endpoints добавляются на этапе реализации модуля.
Route::prefix(config('notifications.routes.prefix', 'api/v1'))
    ->middleware(config('notifications.routes.middleware', ['api']))
    ->group(function (): void {
        // planned
    });
