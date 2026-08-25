<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Notifications\Domain\Contracts\PushTransport;
use Vendor\Notifications\Domain\Models\PushSubscription;
use Vendor\Notifications\Testing\FakePushTransport;

uses(RefreshDatabase::class);

/** Присутствие подменяем in-memory реестром: Redis в этом тесте не нужен. */
function presence(array $activePairs = []): void
{
    app()->instance(PresenceRegistry::class, new class($activePairs) implements PresenceRegistry
    {
        public function __construct(private array $active) {}

        public function markActive(string $roomId, string $userId, int $ttlSeconds = 60): void {}

        public function markInactive(string $roomId, string $userId): void {}

        public function isActiveInRoom(string $roomId, string $userId): bool
        {
            return in_array("{$roomId}:{$userId}", $this->active, true);
        }

        public function activeUserIds(string $roomId): array
        {
            return [];
        }

        public function markTyping(string $roomId, string $userId, int $ttlSeconds = 7): void {}

        public function stopTyping(string $roomId, string $userId): void {}

        public function typingUserIds(string $roomId): array
        {
            return [];
        }
    });
}

function roomWithTwo(): array
{
    $room = Room::factory()->create(['name' => 'Общая']);
    $author = User::factory()->create();
    $reader = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $author->getKey()]);
    RoomMember::factory()->for($room)->create(['user_id' => $reader->getKey()]);

    return [$room, $author, $reader];
}

it('notifies a member who is not in the room and never the sender', function (): void {
    presence();
    [$room, $author, $reader] = roomWithTwo();

    $this->actingAs($author)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет всем'])
        ->assertCreated();

    expect(DB::table('notifications')->where('notifiable_id', $reader->getKey())->count())->toBe(1)
        ->and(DB::table('notifications')->where('notifiable_id', $author->getKey())->count())->toBe(0);

    $this->actingAs($reader)->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('meta.unread', 1)
        ->assertJsonPath('data.0.room_name', 'Общая');
});

it('stays silent for a member who is active in that room', function (): void {
    [$room, $author, $reader] = roomWithTwo();
    presence(["{$room->id}:{$reader->getKey()}"]);

    $this->actingAs($author)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет'])
        ->assertCreated();

    expect(DB::table('notifications')->count())->toBe(0);
});

it('raises a mention notification instead of a plain message one', function (): void {
    presence();
    [$room, $author, $reader] = roomWithTwo();

    $this->actingAs($author)->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Посмотри, пожалуйста',
        'mentions' => [(string) $reader->getKey()],
    ])->assertCreated();

    $row = DB::table('notifications')->where('notifiable_id', $reader->getKey())->first();

    expect(json_decode((string) $row->data, true)['category'])->toBe('mention');
});

it('does not notify anyone about system membership entries', function (): void {
    presence();
    $room = Room::factory()->create();
    $owner = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $owner->getKey()]);
    $guest = User::factory()->create();

    $this->actingAs($guest)->postJson("/api/v1/rooms/{$room->id}/members/me")->assertCreated();

    // Само вступление — системная запись в ленте комнаты, а не уведомление.
    expect(DB::table('notifications')->where('notifiable_id', $owner->getKey())->count())->toBe(0);
});

it('notifies an invited member', function (): void {
    presence();
    $room = Room::factory()->create(['name' => 'Кухня']);
    $owner = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)
        ->create(['user_id' => $owner->getKey()]);
    $invitee = User::factory()->create();

    $this->actingAs($owner)->postJson("/api/v1/rooms/{$room->id}/members", [
        'user_id' => (string) $invitee->getKey(),
    ])->assertCreated();

    $row = DB::table('notifications')->where('notifiable_id', $invitee->getKey())->first();

    expect($row)->not->toBeNull()
        ->and(json_decode((string) $row->data, true)['category'])->toBe('room_invite');
});

it('pushes to devices of a member who is not in the room', function (): void {
    config()->set('notifications.push.public_key', 'BPublicKeyForTests');
    config()->set('notifications.push.private_key', 'PrivateKeyForTests');

    $transport = new FakePushTransport;
    app()->instance(PushTransport::class, $transport);

    presence();
    [$room, $author, $recipient] = roomWithTwo();
    PushSubscription::query()->create([
        'user_id' => $recipient->getKey(),
        'endpoint' => 'https://push.example.com/recipient',
        'endpoint_hash' => PushSubscription::hashEndpoint('https://push.example.com/recipient'),
        'p256dh' => 'key',
        'auth' => 'auth',
    ]);

    $this->actingAs($author)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'пирог готов'])
        ->assertCreated();

    expect($transport->sent)->toHaveCount(1);

    $notification = json_decode($transport->sent[0]['payload'], true);
    expect($notification['title'])->toBe($room->name)
        ->and($notification['body'])->toContain('пирог готов')
        ->and($notification['url'])->toBe('/rooms/'.$room->id);
});

it('sends no push to the author or to someone reading the room', function (): void {
    config()->set('notifications.push.public_key', 'BPublicKeyForTests');
    config()->set('notifications.push.private_key', 'PrivateKeyForTests');

    $transport = new FakePushTransport;
    app()->instance(PushTransport::class, $transport);

    [$room, $author, $recipient] = roomWithTwo();
    // Получатель сейчас читает эту комнату.
    presence(["{$room->id}:{$recipient->getKey()}"]);

    foreach ([$author, $recipient] as $user) {
        PushSubscription::query()->create([
            'user_id' => $user->getKey(),
            'endpoint' => 'https://push.example.com/'.$user->getKey(),
            'endpoint_hash' => PushSubscription::hashEndpoint('https://push.example.com/'.$user->getKey()),
            'p256dh' => 'key',
            'auth' => 'auth',
        ]);
    }

    $this->actingAs($author)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'я тут'])
        ->assertCreated();

    expect($transport->sent)->toBe([]);
});
