<?php

declare(strict_types=1);

namespace Vendor\Ai;

use Illuminate\Cache\RateLimiter as LaravelRateLimiter;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\ServiceProvider;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Infrastructure\Prompts\PromptLibrary;
use Vendor\Ai\Infrastructure\Providers\NullProvider;
use Vendor\Ai\Infrastructure\Providers\PolzaProvider;
use Vendor\Ai\Infrastructure\Quota\RateLimiter;
use Vendor\Ai\Infrastructure\Resilience\CircuitBreaker;
use Vendor\Ai\Infrastructure\Resilience\RetryPolicy;

final class AiServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/ai.php', 'ai');

        $this->app->bind(PromptLibrary::class, fn (): PromptLibrary => new PromptLibrary);

        // Поставщик выбирается конфигурацией; приложение может подменить binding.
        $this->app->bind(TextRevisionProvider::class, function ($app): TextRevisionProvider {
            $config = $app['config'];
            $name = (string) $config->get('ai.provider', 'null');

            if ($name !== 'polza') {
                return new NullProvider;
            }

            $settings = $config->get('ai.providers.polza');

            if (empty($settings['api_key'])) {
                // Ключа нет — молчаливый поставщик вместо падения приложения.
                return new NullProvider;
            }

            return new PolzaProvider(
                http: $app->make(HttpFactory::class),
                prompts: $app->make(PromptLibrary::class),
                baseUrl: (string) $settings['base_url'],
                apiKey: (string) $settings['api_key'],
                model: (string) $settings['model'],
                timeoutSeconds: (int) $config->get('ai.limits.timeout_seconds', 20),
            );
        });

        $this->app->bind(RateLimiter::class, fn ($app): RateLimiter => new RateLimiter(
            limiter: $app->make(LaravelRateLimiter::class),
            perMinute: (int) $app['config']->get('ai.limits.per_user_minute', 6),
            perHour: (int) $app['config']->get('ai.limits.per_user_hourly', 60),
        ));

        $this->app->bind(CircuitBreaker::class, fn ($app): CircuitBreaker => new CircuitBreaker(
            cache: $app->make(Cache::class),
            failuresBeforeOpen: (int) $app['config']->get('ai.circuit_breaker.failures_before_open', 5),
            openSeconds: (int) $app['config']->get('ai.circuit_breaker.open_seconds', 60),
        ));

        $this->app->bind(RetryPolicy::class, fn ($app): RetryPolicy => new RetryPolicy(
            (int) $app['config']->get('ai.limits.retries', 1),
        ));
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if (config('ai.routes.enabled', true)) {
            $this->loadRoutesFrom(__DIR__.'/../routes/api.php');
        }

        $this->publishes([
            __DIR__.'/../config/ai.php' => config_path('ai.php'),
        ], 'ai-config');
    }
}
