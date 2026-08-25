<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('media');
});

function roomUserWith(Room $room, RoomRole $role): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return $user;
}

function photoUpload(): UploadedFile
{
    return UploadedFile::fake()->image('room.jpg', 800, 800);
}

it('lets the owner and the admin set the room photo', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomUserWith($room, RoomRole::Owner);
    $admin = roomUserWith($room, RoomRole::Admin);

    $set = $this->actingAs($owner)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertOk()->json('data');

    expect($set['url'])->not->toBeNull()->and($set['thumb_url'])->not->toBeNull();

    // Фотография видна в представлении комнаты вместо эмодзи.
    $shown = $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}")->assertOk()->json('data');
    expect($shown['photo_url'])->not->toBeNull()->and($shown['photo_large_url'])->not->toBeNull();

    $this->actingAs($admin)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertOk();
});

it('refuses the photo to a plain member and hides a private room from an outsider', function (): void {
    $room = Room::factory()->privateRoom()->create();
    roomUserWith($room, RoomRole::Owner);
    $member = roomUserWith($room, RoomRole::Member);
    $outsider = User::factory()->create();

    $this->actingAs($member)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');

    $this->actingAs($outsider)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertStatus(404)->assertJsonPath('code', 'not_found');

    $this->actingAs($member)->deleteJson("/api/v1/rooms/{$room->id}/photo")->assertStatus(403);
    $this->actingAs($outsider)->deleteJson("/api/v1/rooms/{$room->id}/photo")->assertStatus(404);

    expect($room->fresh()->photo())->toBeNull();
});

it('refuses anything that is not an image', function (): void {
    $room = Room::factory()->create();
    $owner = roomUserWith($room, RoomRole::Owner);

    $this->actingAs($owner)
        ->postJson("/api/v1/rooms/{$room->id}/photo", [
            'image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])
        ->assertStatus(422);

    expect($room->fresh()->photo())->toBeNull();
});

it('serves the photo to members and refuses it to outsiders of a private room', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomUserWith($room, RoomRole::Owner);
    $member = roomUserWith($room, RoomRole::Member);
    $outsider = User::factory()->create();

    $photo = $this->actingAs($owner)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertOk()->json('data');

    $response = $this->actingAs($member)->get($photo['url'])->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('image/webp')
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff');

    $this->actingAs($member)->get($photo['thumb_url'])->assertOk();

    // Для постороннего приватной комнаты не существует — и её фотографии тоже.
    $this->actingAs($outsider)->getJson($photo['url'])->assertStatus(404);
    $this->actingAs($outsider)->getJson($photo['thumb_url'])->assertStatus(404);
});

it('takes the room photo away when the room is deleted for good', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomUserWith($room, RoomRole::Owner);

    $this->actingAs($owner)
        ->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])
        ->assertOk();

    $media = $room->fresh()->photo();
    $path = $media->getPathRelativeToRoot();
    Storage::disk('media')->assertExists($path);

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}")->assertNoContent();

    // Комнаты нет — её файлы не должны занимать место в хранилище.
    $this->assertDatabaseMissing('media', ['id' => $media->getKey()]);
    Storage::disk('media')->assertMissing($path);
});

it('clears the photo and returns the room to its emoji', function (): void {
    $room = Room::factory()->create();
    $owner = roomUserWith($room, RoomRole::Owner);

    $this->actingAs($owner)->post("/api/v1/rooms/{$room->id}/photo", ['image' => photoUpload()])->assertOk();
    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/photo")->assertNoContent();

    $shown = $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}")->assertOk()->json('data');
    expect($shown['photo_url'])->toBeNull()->and($shown['photo_large_url'])->toBeNull();
});
