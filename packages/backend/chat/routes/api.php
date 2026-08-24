<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Маршруты пакета vendor/chat. Endpoints добавляются на этапе реализации модуля.
Route::prefix(config('chat.routes.prefix', 'api/v1'))
    ->middleware(config('chat.routes.middleware', ['api']))
    ->group(function (): void {
        // planned
    });
