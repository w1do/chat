<?php

declare(strict_types=1);

namespace Vendor\Notifications;

use Illuminate\Support\ServiceProvider;
use Vendor\Notifications\Domain\Contracts\ActivityInspector;
use Vendor\Notifications\Domain\Contracts\PreferenceResolver;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Infrastructure\Preferences\EloquentPreferenceResolver;
use Vendor\Notifications\Infrastructure\Presence\AlwaysInactiveInspector;
use Vendor\Notifications\Infrastructure\Push\WebPushTransport;
use Vendor\Notifications\Presentation\Console\GeneratePushKeysCommand;
use Vendor\Notifications\Presentation\Console\SendTestPushCommand;

final class NotificationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/notifications.php', 'notifications');

        $this->app->bind(PreferenceResolver::class, EloquentPreferenceResolver::class);

        // По умолчанию «никто не активен»: реальную проверку присутствия
        // подставляет приложение через PackageWiringProvider (§4.1).
        $this->app->bind(ActivityInspector::class, AlwaysInactiveInspector::class);

        // Библиотека Web Push живёт за контрактом: тесты подставляют свой
        // транспорт, приложение может заменить реализацию.
        $this->app->bind(PushTransport::class, WebPushTransport::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if (config('notifications.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        if ($this->app->runningInConsole()) {
            $this->commands([GeneratePushKeysCommand::class, SendTestPushCommand::class]);
        }

        $this->publishes([
            __DIR__.'/../config/notifications.php' => config_path('notifications.php'),
        ], 'notifications-config');
    }
}
