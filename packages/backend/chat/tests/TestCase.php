<?php

declare(strict_types=1);

namespace Vendor\Chat\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\SanctumServiceProvider;
use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Spatie\MediaLibrary\MediaLibraryServiceProvider;
use Vendor\Chat\ChatServiceProvider;
use Vendor\Chat\Tests\Support\TestPathGenerator;
use Vendor\Identity\IdentityServiceProvider;

abstract class TestCase extends TestbenchTestCase
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [
            SanctumServiceProvider::class,
            MediaLibraryServiceProvider::class,
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

        // Медиа в тестах пакета: диск подменяется Storage::fake, конверсии
        // выполняются синхронно. Раскладка бакета — забота приложения; здесь
        // её повторяет фикстура, как и таблицу медиа ниже.
        $app['config']->set('media-library.disk_name', 'media');
        $app['config']->set('media-library.queue_connection_name', 'sync');
        $app['config']->set('media-library.queue_name', 'media');
        $app['config']->set('media-library.path_generator', TestPathGenerator::class);
        $app['config']->set('filesystems.disks.media', [
            'driver' => 'local',
            'root' => storage_path('framework/testing/disks/media'),
            'visibility' => 'private',
            'throw' => true,
        ]);
    }

    protected function defineDatabaseMigrations(): void
    {
        // Таблица медиа принадлежит приложению; для тестов пакета её
        // повторяет фикстура (владельцы медиа здесь на ULID-ключах).
        $this->loadMigrationsFrom(__DIR__.'/database/migrations');
    }
}
