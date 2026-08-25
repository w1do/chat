<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\Readiness\DatabaseCheck;
use App\Support\Readiness\HttpHealthCheck;
use App\Support\Readiness\QueueCheck;
use App\Support\Readiness\ReadinessProbe;
use App\Support\Readiness\RedisCheck;
use App\Support\Readiness\StorageCheck;
use App\Support\Readiness\TcpCheck;
use App\Support\Storage\MediaBucket;
use Aws\S3\S3Client;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // scoped, не singleton: под Octane worker живёт много запросов (CLAUDE.md, Octane safety).
        $this->app->scoped(ReadinessProbe::class, function ($app): ReadinessProbe {
            $reverb = $app['config']->get('services.reverb_server');
            $typesense = $app['config']->get('services.typesense');

            return new ReadinessProbe([
                $app->make(DatabaseCheck::class),
                $app->make(RedisCheck::class),
                $app->make(QueueCheck::class),
                new TcpCheck('websocket', $reverb['host'], $reverb['port']),
                new HttpHealthCheck(
                    $app->make(HttpFactory::class),
                    'search',
                    sprintf('http://%s:%d/health', $typesense['host'], $typesense['port']),
                ),
                // Хранилище обязательно (ADR-011): без него вложения и медиа
                // не работают, и это должно быть видно до первой загрузки.
                $app->make(StorageCheck::class),
            ]);
        });

        // Клиент собирается из того же диска, которым пишет приложение:
        // бакет и адрес описаны один раз (config/filesystems.php).
        $this->app->bind(MediaBucket::class, function ($app): MediaBucket {
            $disk = (array) $app['config']->get('filesystems.disks.media');

            return new MediaBucket(
                new S3Client([
                    'version' => 'latest',
                    'region' => (string) ($disk['region'] ?? 'us-east-1'),
                    'endpoint' => $disk['endpoint'] ?? null,
                    'use_path_style_endpoint' => (bool) ($disk['use_path_style_endpoint'] ?? true),
                    'credentials' => [
                        'key' => (string) ($disk['key'] ?? ''),
                        'secret' => (string) ($disk['secret'] ?? ''),
                    ],
                    'http' => $disk['http'] ?? ['connect_timeout' => 3, 'timeout' => 10],
                ]),
                (string) ($disk['bucket'] ?? 'chat'),
            );
        });
    }

    public function boot(): void
    {
        //
    }
}
