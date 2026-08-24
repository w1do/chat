<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

final class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Sanctum SPA: маршрут авторизации каналов должен пройти session-стек
        // (иначе cookie не читается и auth возвращает 401) — ADR-005.
        Broadcast::routes(['middleware' => ['web', 'auth:sanctum']]);

        require base_path('routes/channels.php');
    }
}
