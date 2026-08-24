<?php

declare(strict_types=1);

namespace Vendor\Chat;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MembershipPolicy;
use Vendor\Chat\Domain\Policies\RoomPolicy;

final class ChatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/chat.php', 'chat');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        Gate::policy(Room::class, RoomPolicy::class);
        Gate::policy(RoomMember::class, MembershipPolicy::class);

        if (config('chat.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/chat.php' => config_path('chat.php'),
        ], 'chat-config');
    }
}
