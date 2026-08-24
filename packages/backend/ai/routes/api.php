<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Ai\Presentation\Http\Api\V1\Controllers\MessageRevisionController;

Route::prefix(config('ai.routes.prefix', 'api/v1'))
    ->middleware([...config('ai.routes.middleware', ['api']), 'auth:sanctum'])
    ->name('ai.')
    ->group(function (): void {
        // Клиент может отменить ожидание: запрос синхронный и без побочных
        // эффектов, отмена на стороне клиента прекращает ожидание ответа.
        Route::post('/ai/message-revisions', [MessageRevisionController::class, 'store'])
            ->name('message-revisions.store');
    });
