<?php

declare(strict_types=1);

namespace Vendor\Identity;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Vendor\Identity\Domain\Models\User;

final class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/identity.php', 'identity');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        $this->configureRateLimiters();
        EncryptCookies::except((string) config('identity.browser_token.cookie', '__Host-chat_browser_token'));

        // Провайдер пользователей auth использует настроенный класс приложения
        // либо базовую модель пакета.
        config(['auth.providers.users.model' => config('identity.user_model') ?? User::class]);

        if (config('identity.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/identity.php' => config_path('identity.php'),
        ], 'identity-config');
    }

    private function configureRateLimiters(): void
    {
        RateLimiter::for('identity-login', fn (Request $request) => Limit::perMinute(
            (int) config('identity.limits.login', 5),
        )->by(mb_strtolower((string) $request->input('login')).'|'.$request->ip()));

        RateLimiter::for('identity-register', fn (Request $request) => Limit::perMinute(
            (int) config('identity.limits.register', 10),
        )->by($request->ip()));

        RateLimiter::for('identity-password-reset', fn (Request $request) => Limit::perMinute(
            (int) config('identity.limits.password_reset', 5),
        )->by($request->ip()));

        // Загрузка картинок дороже обычного запроса: и по трафику, и по
        // обработке. Ограничение на человека, а не на адрес.
        RateLimiter::for('identity-images', fn (Request $request) => Limit::perMinute(
            (int) config('identity.limits.images', 20),
        )->by((string) $request->user()?->getAuthIdentifier()));
    }
}
