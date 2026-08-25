<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Vendor\Chat\Application\Commands\ClearRoomPhotoCommand;
use Vendor\Chat\Application\Commands\SetRoomPhotoCommand;
use Vendor\Chat\Application\Handlers\Commands\ClearRoomPhotoHandler;
use Vendor\Chat\Application\Handlers\Commands\SetRoomPhotoHandler;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Policies\RoomPolicy;
use Vendor\Identity\Domain\Models\User;

beforeEach(function (): void {
    Storage::fake('media');
});

function setPhoto(Room $room, string $name = 'room.jpg'): array
{
    $file = UploadedFile::fake()->image($name, 900, 900);

    $data = app(SetRoomPhotoHandler::class)->handle(new SetRoomPhotoCommand(
        roomId: $room->id,
        filePath: $file->getRealPath(),
        fileName: $name,
    ));

    return ['data' => $data, 'media' => $room->fresh()->photo()];
}

it('stores the room photo as prepared webp without the original', function (): void {
    $room = Room::factory()->create();

    ['media' => $media] = setPhoto($room, 'kitchen.png');

    expect($media->file_name)->toEndWith('.webp')
        ->and($media->mime_type)->toBe('image/webp')
        ->and($media->hasGeneratedConversion('thumb'))->toBeTrue();

    Storage::disk('media')->assertExists($media->getPathRelativeToRoot());
    Storage::disk('media')->assertExists($media->getPathRelativeToRoot('thumb'));

    [$width] = getimagesizefromstring(Storage::disk('media')->get($media->getPathRelativeToRoot()));
    expect($width)->toBeLessThanOrEqual((int) config('chat.images.photo.large'));
});

it('replaces the previous photo and takes its files away', function (): void {
    $room = Room::factory()->create();
    ['media' => $first] = setPhoto($room, 'one.jpg');
    $firstPath = $first->getPathRelativeToRoot();

    ['media' => $second] = setPhoto($room, 'two.jpg');

    // Фотография одна: набора прежних у комнаты нет.
    expect($room->fresh()->getMedia(Room::PHOTO))->toHaveCount(1)
        ->and($second->getKey())->not->toBe($first->getKey());
    Storage::disk('media')->assertMissing($firstPath);
});

it('clears the photo and removes its files', function (): void {
    $room = Room::factory()->create();
    ['media' => $media] = setPhoto($room);
    $path = $media->getPathRelativeToRoot();

    app(ClearRoomPhotoHandler::class)->handle(new ClearRoomPhotoCommand($room->id));

    expect($room->fresh()->photo())->toBeNull()
        ->and(Media::query()->where('collection_name', Room::PHOTO)->count())->toBe(0);
    Storage::disk('media')->assertMissing($path);
});

it('shows an emoji fallback while there is no photo', function (): void {
    $room = Room::factory()->create();

    expect($room->photo())->toBeNull();
});

it('refuses a photo change to an outsider of a public room without hiding it', function (): void {
    // Публичная комната видна всем: отказ, а не «не найдено».
    $publicRoom = Room::factory()->create();
    $outsider = User::factory()->create();

    $response = (new RoomPolicy)->changePhoto($outsider, $publicRoom);

    expect($response->allowed())->toBeFalse()
        ->and($response->status())->toBeNull();
});
