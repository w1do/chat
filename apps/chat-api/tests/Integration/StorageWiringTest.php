<?php

declare(strict_types=1);

use App\Support\Media\CollectionPathGenerator;
use App\Support\Readiness\StorageCheck;
use App\Support\Storage\MediaBucket;
use Aws\Command;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3ClientInterface;
use GuzzleHttp\Psr7\Response;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\Conversions\Jobs\PerformConversionsJob;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

uses(RefreshDatabase::class);

/** Тестовый владелец медиа: настоящие появятся в следующих изменениях. */
class StorageWiringOwner extends Model implements HasMedia
{
    use InteractsWithMedia;

    protected $table = 'storage_wiring_owners';

    protected $guarded = [];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments');
        $this->addMediaCollection('avatars');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        // Общие правила (ADR-011): производные — webp, готовятся в очереди.
        $this->addMediaConversion('thumb')->format('webp')->width(320)->queued();
    }
}

function makeOwner(): StorageWiringOwner
{
    if (! Schema::hasTable('storage_wiring_owners')) {
        Schema::create('storage_wiring_owners', function ($table): void {
            $table->id();
            $table->string('name')->nullable();
            $table->timestamps();
        });
    }

    return StorageWiringOwner::query()->create(['name' => 'owner']);
}

it('keeps the media disk private and writes each kind under its prefix', function (): void {
    // Диск закрытый: публичный бакет обесценил бы проверку прав (spec object-storage).
    expect(config('filesystems.disks.media.visibility'))->toBe('private')
        ->and(config('filesystems.disks.media.bucket'))->toBe('chat')
        ->and(config('media-library.disk_name'))->toBe('media');

    Storage::fake('media');
    $owner = makeOwner();

    $attachment = $owner->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('attachments');
    $avatar = $owner->addMedia(UploadedFile::fake()->image('face.jpg'))
        ->toMediaCollection('avatars');

    expect(app(CollectionPathGenerator::class)->getPath($attachment))
        ->toBe("uploads/{$attachment->getKey()}/")
        ->and(app(CollectionPathGenerator::class)->getPath($avatar))
        ->toBe("avatars/{$avatar->getKey()}/");

    Storage::disk('media')->assertExists("uploads/{$attachment->getKey()}/photo.jpg");
    Storage::disk('media')->assertExists("avatars/{$avatar->getKey()}/face.jpg");
});

it('sends an unknown collection to uploads instead of the bucket root', function (): void {
    Storage::fake('media');
    $owner = makeOwner();

    $media = $owner->addMedia(UploadedFile::fake()->image('any.jpg'))
        ->toMediaCollection('unmapped');

    expect(app(CollectionPathGenerator::class)->getPath($media))
        ->toBe("uploads/{$media->getKey()}/");
});

it('queues conversions on the media queue', function (): void {
    Storage::fake('media');

    // Постановка в очередь: конверсия не задерживает основную операцию.
    Queue::fake([PerformConversionsJob::class]);
    makeOwner()->addMedia(UploadedFile::fake()->image('queued.jpg', 640, 480))
        ->toMediaCollection('avatars');

    Queue::assertPushedOn('media', PerformConversionsJob::class);
});

it('produces webp when the conversion runs', function (): void {
    Storage::fake('media');

    // Очередь в тестах синхронная: конверсия выполняется тут же.
    $media = makeOwner()->addMedia(UploadedFile::fake()->image('made.jpg', 640, 480))
        ->toMediaCollection('avatars');

    Storage::disk('media')->assertExists(
        "avatars/{$media->getKey()}/conversions/made-thumb.webp",
    );
});

it('reports the bucket as created once and as existing on repeat', function (): void {
    $created = 0;
    $exists = false;

    $client = Mockery::mock(S3ClientInterface::class);
    $client->shouldReceive('headBucket')->andReturnUsing(function () use (&$exists): array {
        if (! $exists) {
            throw new S3Exception('missing', new Command('HeadBucket'), ['response' => new Response(404)]);
        }

        return [];
    });
    $client->shouldReceive('createBucket')->andReturnUsing(function () use (&$created, &$exists): array {
        $created++;
        $exists = true;

        return [];
    });

    $bucket = new MediaBucket($client, 'chat');

    expect($bucket->ensure())->toBe('created')
        ->and($bucket->ensure())->toBe('exists')
        ->and($created)->toBe(1);
});

it('treats a lost bucket-creation race as success', function (): void {
    $client = Mockery::mock(S3ClientInterface::class);
    $client->shouldReceive('headBucket')->andThrow(
        new S3Exception('missing', new Command('HeadBucket'), ['response' => new Response(404)]),
    );
    $client->shouldReceive('createBucket')->andThrow(
        new S3Exception('owned', new Command('CreateBucket'), ['code' => 'BucketAlreadyOwnedByYou']),
    );

    expect((new MediaBucket($client, 'chat'))->ensure())->toBe('exists');
});

it('fails the ensure command loudly when storage is unreachable', function (): void {
    config()->set('filesystems.disks.media.endpoint', 'http://127.0.0.1:59996');
    config()->set('filesystems.disks.media.http', ['connect_timeout' => 1, 'timeout' => 1]);

    $this->artisan('storage:ensure-bucket')->assertFailed();
});

it('storage check passes on a reachable disk and fails on an unreachable one', function (): void {
    Storage::fake('media');
    expect(app(StorageCheck::class)->check()->isOk())->toBeTrue();

    // Настоящий s3-диск в недоступный порт: отказ, а не зависание.
    Storage::forgetDisk('media');
    config()->set('filesystems.disks.media.endpoint', 'http://127.0.0.1:59996');
    config()->set('filesystems.disks.media.http', ['connect_timeout' => 1, 'timeout' => 1]);
    config()->set('filesystems.disks.media.retries', 0);

    $status = app(StorageCheck::class)->check();

    expect($status->isOk())->toBeFalse()
        ->and(json_encode($status->toArray()))->not->toContain('59996')
        ->not->toContain('127.0.0.1');
});
