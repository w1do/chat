<?php

declare(strict_types=1);

namespace Vendor\Ai\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\SanctumServiceProvider;
use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Ai\AiServiceProvider;
use Vendor\Ai\Domain\Contracts\Metrics;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Testing\FakeSummaryPublisher;
use Vendor\Ai\Testing\FakeSummarySource;
use Vendor\Ai\Testing\InMemoryMetrics;
use Vendor\Identity\IdentityServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [
            SanctumServiceProvider::class,
            IdentityServiceProvider::class,
            AiServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('session.driver', 'array');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('ai.enabled', true);
        $app['config']->set('ai.routes.middleware', ['web']);
        $app['config']->set('identity.routes.enabled', false);
        $app['config']->set('queue.default', 'sync');

        // Переписку и публикацию связывает приложение-композиция: в тестах
        // пакета их место занимают фейки того же контракта (§4.1).
        $app->singleton(SummarySource::class, fn (): FakeSummarySource => new FakeSummarySource);
        $app->singleton(SummaryPublisher::class, fn (): FakeSummaryPublisher => new FakeSummaryPublisher);
        $app->singleton(Metrics::class, fn (): InMemoryMetrics => new InMemoryMetrics);
    }
}
