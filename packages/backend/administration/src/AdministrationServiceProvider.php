<?php

declare(strict_types=1);

namespace Vendor\Administration;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\ServiceProvider;
use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Administration\Infrastructure\Persistence\EloquentAuditRecorder;
use Vendor\Administration\Infrastructure\Persistence\SettingsStore;
use Vendor\Administration\Infrastructure\Redaction\ContextRedactor;

final class AdministrationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/administration.php', 'administration');

        $this->app->bind(ContextRedactor::class, fn (): ContextRedactor => new ContextRedactor(
            maxStringLength: (int) config('administration.audit.max_context_string', 200),
        ));

        $this->app->bind(AuditRecorder::class, EloquentAuditRecorder::class);

        $this->app->bind(SettingsStore::class, fn ($app): SettingsStore => new SettingsStore(
            cache: $app->make(Cache::class),
            ttlSeconds: (int) config('administration.settings_cache_ttl', 60),
        ));
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if (config('administration.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/administration.php' => config_path('administration.php'),
        ], 'administration-config');
    }
}
