<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Infrastructure\Broadcasting\MessageCreatedV1;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('media');
});

function memberWithRole(Room $room, RoomRole $role): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return $user;
}

it('carries the avatar into the member list and the message feed', function (): void {
    $room = Room::factory()->create();
    $author = memberWithRole($room, RoomRole::Owner);
    $plain = memberWithRole($room, RoomRole::Member);

    $this->actingAs($author)
        ->post('/api/v1/me/avatars', ['image' => UploadedFile::fake()->image('face.jpg')])
        ->assertCreated();

    $this->actingAs($author)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет!'])
        ->assertCreated();

    $members = $this->actingAs($plain)->getJson("/api/v1/rooms/{$room->id}/members")
        ->assertOk()->json('data');
    $withAvatar = collect($members)->firstWhere('user_id', $author->getKey());
    $without = collect($members)->firstWhere('user_id', $plain->getKey());

    expect($withAvatar['avatar_url'])->not->toBeNull()
        // Без аватарки — null, а не пустая строка: по нему клиент рисует букву.
        ->and($without['avatar_url'])->toBeNull();

    $feed = $this->actingAs($plain)->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()->json('data');
    $message = collect($feed)->firstWhere('author_id', $author->getKey());

    expect($message['author_avatar_url'])->toBe($withAvatar['avatar_url']);
});

it('never lists someone else previous avatars', function (): void {
    $room = Room::factory()->create();
    $author = memberWithRole($room, RoomRole::Owner);
    $viewer = memberWithRole($room, RoomRole::Member);

    foreach (['one.jpg', 'two.jpg', 'three.jpg'] as $name) {
        $this->actingAs($author)
            ->post('/api/v1/me/avatars', ['image' => UploadedFile::fake()->image($name)])
            ->assertCreated();
    }

    $members = $this->actingAs($viewer)->getJson("/api/v1/rooms/{$room->id}/members")
        ->assertOk()->json('data');
    $shown = collect($members)->firstWhere('user_id', $author->getKey());

    // Виден только текущий адрес: набор — личное дело владельца (design 3).
    expect(array_keys($shown))->toBe(['id', 'room_id', 'user_id', 'role', 'joined_at', 'name', 'avatar_url']);

    // У владельца набор из трёх, у смотрящего — свой, пустой.
    $this->actingAs($author)->getJson('/api/v1/me/avatars')->assertOk()->assertJsonCount(3, 'data');
    $this->actingAs($viewer)->getJson('/api/v1/me/avatars')->assertOk()->assertJsonCount(0, 'data');
});

it('reports room photo fields and omits them when there is none', function (): void {
    $withPhoto = Room::factory()->create();
    $withoutPhoto = Room::factory()->create();
    $owner = memberWithRole($withPhoto, RoomRole::Owner);
    memberWithRole($withoutPhoto, RoomRole::Owner);

    $this->actingAs($owner)
        ->post("/api/v1/rooms/{$withPhoto->id}/photo", ['image' => UploadedFile::fake()->image('room.jpg')])
        ->assertOk();

    $list = $this->actingAs($owner)->getJson('/api/v1/rooms')->assertOk()->json('data');

    expect(collect($list)->firstWhere('id', $withPhoto->id)['photo_url'])->not->toBeNull()
        ->and(collect($list)->firstWhere('id', $withoutPhoto->id)['photo_url'])->toBeNull();
});

it('keeps the avatar out of the real-time payload', function (): void {
    $room = Room::factory()->create();
    $author = memberWithRole($room, RoomRole::Owner);

    $this->actingAs($author)
        ->post('/api/v1/me/avatars', ['image' => UploadedFile::fake()->image('face.jpg')])
        ->assertCreated();

    $message = Message::factory()->for($room)
        ->create(['author_id' => $author->getKey()]);

    $broadcast = null;
    Event::listen(
        MessageCreatedV1::class,
        function ($event) use (&$broadcast): void {
            $broadcast = $event->data;
        },
    );

    event(new MessageCreated($room->id, $message->id));

    // Схема события не менялась: аватарки в payload нет (spec contracts).
    expect(array_keys($broadcast['author']))->toBe(['id', 'name']);
});
