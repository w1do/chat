<?php

declare(strict_types=1);

use App\Http\Controllers\ReadinessController;
use Illuminate\Support\Facades\Route;

// Route-файлы backend-пакетов загружаются их Service Provider'ами
// (см. packages/backend/*/routes/api.php). Здесь остаются только
// app-специфичные маршруты composition root.

// Readiness: зависимость-осведомлённая проверка без утечки деталей
// (liveness — стандартный /up). Отчёт: octane, database, redis, queue,
// websocket, search.
Route::get('/api/v1/readiness', ReadinessController::class)->name('readiness');
