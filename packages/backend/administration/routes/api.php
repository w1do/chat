<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Vendor\Administration\Domain\Enums\Ability;
use Vendor\Administration\Presentation\Http\Api\V1\Controllers\AdminController;

// Каждый admin-маршрут закрыт правом (CLAUDE.md §«Права»); источник прав —
// приложение, пакет только объявляет, что проверять.
Route::prefix(config('administration.routes.prefix', 'api/v1'))
    ->middleware([...config('administration.routes.middleware', ['api']), 'auth:sanctum'])
    ->name('administration.')
    ->group(function (): void {
        Route::get('/admin/status', [AdminController::class, 'status'])
            ->middleware('can:'.Ability::ViewSystem->value)
            ->name('status');

        Route::get('/admin/settings', [AdminController::class, 'settings'])
            ->middleware('can:'.Ability::ViewSystem->value)
            ->name('settings.show');

        Route::patch('/admin/settings', [AdminController::class, 'updateSettings'])
            ->middleware('can:'.Ability::UpdateSettings->value)
            ->name('settings.update');

        Route::get('/admin/audit-logs', [AdminController::class, 'audit'])
            ->middleware('can:'.Ability::ViewAudit->value)
            ->name('audit.index');
    });
