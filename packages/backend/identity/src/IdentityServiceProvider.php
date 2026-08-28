<?php

declare(strict_types=1);

namespace Vendor\Identity;

use Illuminate\Auth\AuthManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Vendor\Identity\Application\Handlers\Commands\LoginHandler;
use Vendor\Identity\Domain\Models\User;

final class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/identity.php', 'identity');

        // Вход сверяет пароль провайдером пользователей, а не guard'ом: сессии
        // в схеме больше нет (ADR-012). Binding контекстный — пакет не
        // навязывает приложению собственный UserProvider.
        $this->app->when(LoginHandler::class)
            ->needs(UserProvider::class)
            ->give(static function ($app): UserProvider {
                /** @var AuthFactory&AuthManager $auth */
                $auth = $app->make(AuthFactory::class);

                /** @var UserProvider */
                return $auth->createUserProvider('users');
            });
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        $this->configureRateLimiters();

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
