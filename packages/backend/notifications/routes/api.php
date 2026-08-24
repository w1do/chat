<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Notifications\Presentation\Http\Api\V1\Controllers\NotificationController;
use Vendor\Notifications\Presentation\Http\Api\V1\Controllers\PreferenceController;

Route::prefix(config('notifications.routes.prefix', 'api/v1'))
    ->middleware([...config('notifications.routes.middleware', ['api']), 'auth:sanctum'])
    ->name('notifications.')
    ->group(function (): void {
        Route::get('/notifications', [NotificationController::class, 'index'])->name('index');
        Route::post('/notifications/read', [NotificationController::class, 'markRead'])->name('read');

        Route::get('/notification-preferences', [PreferenceController::class, 'index'])->name('preferences.index');
        Route::patch('/notification-preferences', [PreferenceController::class, 'update'])->name('preferences.update');
    });
