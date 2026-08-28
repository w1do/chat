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
        // Канал авторизуется тем же bearer-токеном, что и HTTP (ADR-012):
        // session-стек здесь не нужен и намеренно отсутствует.
        // Подключение к каналам — тоже присутствие: человек открыл чат, даже
        // если ещё ничего не сделал (spec chat/presence-and-last-seen).
        Broadcast::routes(['middleware' => ['auth:sanctum', TouchLastSeen::class]]);

        require base_path('routes/channels.php');
    }
}
