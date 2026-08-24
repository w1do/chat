<?php

declare(strict_types=1);

namespace Vendor\Chat\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\SanctumServiceProvider;
use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Vendor\Chat\ChatServiceProvider;
use Vendor\Identity\IdentityServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [
            SanctumServiceProvider::class,
            IdentityServiceProvider::class,
            ChatServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('session.driver', 'array');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('chat.routes.middleware', ['web']);
        $app['config']->set('identity.routes.enabled', false);
    }
}
