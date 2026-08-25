<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Identity\Domain\Models\User;

beforeEach(function (): void {
    Storage::fake('media');
});

function uploadAvatar(User $user, ?UploadedFile $file = null): array
{
    return test()->actingAs($user)
        ->post('/api/v1/me/avatars', ['image' => $file ?? UploadedFile::fake()->image('face.jpg', 900, 900)])
        ->assertCreated()
        ->json('data');
}

it('stores only prepared webp and no original', function (): void {
    $user = User::factory()->create();

    uploadAvatar($user, UploadedFile::fake()->image('face.png', 1200, 1200));

    $media = $user->fresh()->getMedia(User::AVATARS)->first();

    // В хранилище — подготовленный webp, а не присланный png (design 6).
    expect($media->file_name)->toEndWith('.webp')
        ->and($media->mime_type)->toBe('image/webp');
    Storage::disk('media')->assertExists($media->getPathRelativeToRoot());

    // Крупный размер ограничен настройкой, мелкий — отдельной конверсией.
    $large = (int) config('identity.images.avatar.large');
    [$width] = getimagesizefromstring(Storage::disk('media')->get($media->getPathRelativeToRoot()));
    expect($width)->toBeLessThanOrEqual($large)
        ->and($media->hasGeneratedConversion('thumb'))->toBeTrue();

    $thumbPath = $media->getPathRelativeToRoot('thumb');
    Storage::disk('media')->assertExists($thumbPath);
    [$thumbWidth] = getimagesizefromstring(Storage::disk('media')->get($thumbPath));
    expect($thumbWidth)->toBeLessThanOrEqual((int) config('identity.images.avatar.thumb'));
});

it('makes an uploaded avatar current right away', function (): void {
    $user = User::factory()->create();

    $data = uploadAvatar($user);

    expect($data['current'])->toBeTrue()
        ->and($user->fresh()->currentAvatar()?->uuid)->toBe($data['id']);

    $me = test()->actingAs($user)->getJson('/api/v1/me')->assertOk()->json('data');
    expect($me['avatar_url'])->not->toBeNull()
        ->and($me['avatar_large_url'])->not->toBeNull();
});

it('lets a person pick a previously uploaded avatar without re-uploading', function (): void {
    $user = User::factory()->create();
    $first = uploadAvatar($user, UploadedFile::fake()->image('one.jpg'));
    $second = uploadAvatar($user, UploadedFile::fake()->image('two.jpg'));

    expect($user->fresh()->currentAvatar()?->uuid)->toBe($second['id']);

    test()->actingAs($user)->patchJson("/api/v1/me/avatars/{$first['id']}")
        ->assertOk()->assertJsonPath('data.current', true);

    // Файл прежней аватарки остался тем же: выбор — это перевод указателя.
    expect($user->fresh()->currentAvatar()?->uuid)->toBe($first['id'])
        ->and(Media::query()->count())->toBe(2);
});

it('keeps the set when the current avatar is merely cleared', function (): void {
    $user = User::factory()->create();
    uploadAvatar($user);

    test()->actingAs($user)->deleteJson('/api/v1/me/avatar')->assertNoContent();

    expect($user->fresh()->currentAvatar())->toBeNull()
        ->and($user->fresh()->getMedia(User::AVATARS))->toHaveCount(1);

    $me = test()->actingAs($user)->getJson('/api/v1/me')->json('data');
    expect($me['avatar_url'])->toBeNull();
});

it('moves the pointer to another avatar when the current one is deleted', function (): void {
    $user = User::factory()->create();
    $first = uploadAvatar($user, UploadedFile::fake()->image('one.jpg'));
    $second = uploadAvatar($user, UploadedFile::fake()->image('two.jpg'));

    test()->actingAs($user)->deleteJson("/api/v1/me/avatars/{$second['id']}")->assertNoContent();

    expect($user->fresh()->currentAvatar()?->uuid)->toBe($first['id']);
});

it('returns to the name letter when the set becomes empty', function (): void {
    $user = User::factory()->create();
    $only = uploadAvatar($user);

    test()->actingAs($user)->deleteJson("/api/v1/me/avatars/{$only['id']}")->assertNoContent();

    expect($user->fresh()->currentAvatar())->toBeNull()
        ->and($user->fresh()->getMedia(User::AVATARS))->toHaveCount(0);
    // Файл ушёл из хранилища вместе с записью.
    expect(Media::query()->count())->toBe(0);
});

it('deleting another avatar leaves the current one alone', function (): void {
    $user = User::factory()->create();
    $first = uploadAvatar($user, UploadedFile::fake()->image('one.jpg'));
    $second = uploadAvatar($user, UploadedFile::fake()->image('two.jpg'));

    test()->actingAs($user)->deleteJson("/api/v1/me/avatars/{$first['id']}")->assertNoContent();

    expect($user->fresh()->currentAvatar()?->uuid)->toBe($second['id']);
});

it('refuses anything that is not an image', function (): void {
    $user = User::factory()->create();

    test()->actingAs($user)
        ->postJson('/api/v1/me/avatars', ['image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')])
        ->assertStatus(422);

    expect($user->fresh()->getMedia(User::AVATARS))->toHaveCount(0);
});

it('refuses an image above the size limit', function (): void {
    config()->set('identity.images.max_size_kb', 64);
    $user = User::factory()->create();

    test()->actingAs($user)
        ->postJson('/api/v1/me/avatars', ['image' => UploadedFile::fake()->image('huge.jpg')->size(256)])
        ->assertStatus(422);
});

it('refuses to grow the set beyond the limit', function (): void {
    config()->set('identity.images.max_avatars', 2);
    $user = User::factory()->create();
    uploadAvatar($user, UploadedFile::fake()->image('one.jpg'));
    uploadAvatar($user, UploadedFile::fake()->image('two.jpg'));

    test()->actingAs($user)
        ->postJson('/api/v1/me/avatars', ['image' => UploadedFile::fake()->image('three.jpg')])
        ->assertStatus(409);

    expect($user->fresh()->getMedia(User::AVATARS))->toHaveCount(2);
});

it('keeps the avatar set to its owner', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    uploadAvatar($owner);

    // Набор доступен только через /me — чужого профиля в адресах нет вовсе.
    $mine = test()->actingAs($stranger)->getJson('/api/v1/me/avatars')->assertOk()->json('data');
    expect($mine)->toHaveCount(0);

    test()->actingAs($owner)->getJson('/api/v1/me/avatars')->assertOk()->assertJsonCount(1, 'data');
});

it('requires authentication for every profile image action', function (): void {
    $this->getJson('/api/v1/me/avatars')->assertStatus(401);
    $this->postJson('/api/v1/me/avatars', [])->assertStatus(401);
    $this->deleteJson('/api/v1/me/avatar')->assertStatus(401);
    $this->postJson('/api/v1/me/wallpaper', [])->assertStatus(401);
});

it('sets, replaces and clears personal wallpaper', function (): void {
    $user = User::factory()->create();

    $set = test()->actingAs($user)
        ->post('/api/v1/me/wallpaper', ['image' => UploadedFile::fake()->image('sea.jpg', 1200, 1600)])
        ->assertOk()->json('data');

    expect($set['url'])->not->toBeNull();
    expect(test()->actingAs($user)->getJson('/api/v1/me')->json('data.wallpaper_url'))->not->toBeNull();

    // Новая картинка вытесняет прежнюю вместе с файлом: обои одни.
    $replaced = test()->actingAs($user)
        ->post('/api/v1/me/wallpaper', ['image' => UploadedFile::fake()->image('forest.jpg')])
        ->assertOk()->json('data');

    expect($replaced['id'])->not->toBe($set['id'])
        ->and($user->fresh()->getMedia(User::WALLPAPER))->toHaveCount(1);

    test()->actingAs($user)->deleteJson('/api/v1/me/wallpaper')->assertNoContent();

    expect($user->fresh()->wallpaper())->toBeNull();
    expect(test()->actingAs($user)->getJson('/api/v1/me')->json('data.wallpaper_url'))->toBeNull();
});

it('keeps wallpaper private to its owner', function (): void {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $wallpaper = test()->actingAs($owner)
        ->post('/api/v1/me/wallpaper', ['image' => UploadedFile::fake()->image('sea.jpg')])
        ->assertOk()->json('data');

    // Собеседник видит свой фон, а не чужие обои.
    expect(test()->actingAs($other)->getJson('/api/v1/me')->json('data.wallpaper_url'))->toBeNull();
    test()->actingAs($other)->get($wallpaper['url'])->assertNotFound();
    test()->actingAs($owner)->get($wallpaper['url'])->assertOk();
});

it('serves avatar files to any signed-in person and refuses guests', function (): void {
    $user = User::factory()->create();
    $viewer = User::factory()->create();
    $avatar = uploadAvatar($user);

    // Гостю без входа изображения не отдают вовсе. actingAs из загрузки
    // держится до конца теста, поэтому guard сбрасывается явно.
    app('auth')->forgetGuards();
    test()->getJson($avatar['url'])->assertStatus(401);

    // Аватарка и так видна в списках участников: её отдают любому вошедшему.
    $response = test()->actingAs($viewer)->get($avatar['url'])->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('image/webp')
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->headers->get('Cache-Control'))->toContain('immutable');

    test()->actingAs($viewer)->get($avatar['thumb_url'])->assertOk();
});
