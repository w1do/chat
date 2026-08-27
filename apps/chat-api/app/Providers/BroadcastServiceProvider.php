<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;
use Vendor\Identity\Presentation\Http\Middleware\TouchLastSeen;

final class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Sanctum SPA: маршрут авторизации каналов должен пройти session-стек
        // (иначе cookie не читается и auth возвращает 401) — ADR-005.
        // Подключение к каналам — тоже присутствие: человек открыл чат, даже
        // если ещё ничего не сделал (spec chat/presence-and-last-seen).
        Broadcast::routes(['middleware' => ['web', 'auth:sanctum', TouchLastSeen::class]]);

        require base_path('routes/channels.php');
    }
}
