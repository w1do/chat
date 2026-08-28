<?php

declare(strict_types=1);

namespace Vendor\Identity\Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\SanctumServiceProvider;
use Orchestra\Testbench\TestCase as TestbenchTestCase;
use Spatie\MediaLibrary\MediaLibraryServiceProvider;
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
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('session.driver', 'array');
        $app['config']->set('cache.default', 'array');
        // Авторизация целиком в заголовке Authorization (ADR-012): сессия,
        // cookie и CSRF в стек маршрутов не входят. Пустой sanctum.guard и
        // guard по умолчанию — те же, что и в приложении: fallback на
        // session-guard отсутствует и здесь.
        $app['config']->set('identity.routes.middleware', ['api']);
        $app['config']->set('sanctum.guard', []);
        $app['config']->set('auth.defaults.guard', 'sanctum');

        // Медиа в тестах пакета: диск подменяется Storage::fake, конверсии
        // выполняются синхронно. Раскладка бакета — забота приложения.
        $app['config']->set('media-library.disk_name', 'media');
        $app['config']->set('media-library.queue_connection_name', 'sync');
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
