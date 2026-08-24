<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

function roomWithMember(RoomRole $role = RoomRole::Member): array
{
    $room = Room::factory()->create();
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return [$room, $user];
}

it('sends a message and lists it in history', function (): void {
    [$room, $user] = roomWithMember();

    $this->actingAs($user)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Hello!'])
        ->assertCreated()
        ->assertJsonPath('data.body', 'Hello!')
        ->assertJsonPath('data.author_id', (string) $user->getKey());

    $this->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()
        ->assertJsonPath('data.0.body', 'Hello!')
        ->assertJsonPath('meta.next_cursor', null);
});

it('forbids non-members from reading or sending in private rooms', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->getJson("/api/v1/rooms/{$room->id}/messages")->assertStatus(403);
    $this->actingAs($outsider)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'hi'])->assertStatus(403);
});

it('rejects invalid bodies and foreign reply targets', function (): void {
    [$room, $user] = roomWithMember();
    $otherRoomMessage = Message::factory()->create();

    $this->actingAs($user)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => ''])
        ->assertStatus(422)->assertJsonPath('code', 'validation_failed');

    $this->actingAs($user)->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'reply',
        'reply_to_id' => $otherRoomMessage->id,
    ])->assertStatus(422);
});

it('replays duplicate sends with the same idempotency key', function (): void {
    [$room, $user] = roomWithMember();
    $headers = ['Idempotency-Key' => 'send-attempt-1'];

    $first = $this->actingAs($user)
        ->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Once'], $headers)
        ->assertCreated();

    $second = $this->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Once'], $headers)
        ->assertOk();

    expect($second->json('data.id'))->toBe($first->json('data.id'))
        ->and(Message::query()->where('room_id', $room->id)->count())->toBe(1);
});

it('edits own recent messages and forbids editing after the window or by others', function (): void {
    [$room, $author] = roomWithMember();
    $message = Message::factory()->for($room)->create(['author_id' => $author->getKey(), 'body' => 'v1']);

    $this->actingAs($author)->patchJson("/api/v1/messages/{$message->id}", ['body' => 'v2'])
        ->assertOk()
        ->assertJsonPath('data.body', 'v2')
        ->assertJsonPath('data.edited_at', fn ($v) => $v !== null);

    $other = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $other->getKey()]);
    $this->actingAs($other)->patchJson("/api/v1/messages/{$message->id}", ['body' => 'x'])->assertStatus(403);

    $message->forceFill(['created_at' => now()->subHour()])->save();
    $this->actingAs($author)->patchJson("/api/v1/messages/{$message->id}", ['body' => 'late'])->assertStatus(403);
});

it('soft deletes by author or room admin and hides the body afterwards', function (): void {
    [$room, $author] = roomWithMember();
    $admin = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Admin)->create(['user_id' => $admin->getKey()]);

    $own = Message::factory()->for($room)->create(['author_id' => $author->getKey()]);
    $foreign = Message::factory()->for($room)->create(['author_id' => $author->getKey()]);

    $this->actingAs($author)->deleteJson("/api/v1/messages/{$own->id}")->assertNoContent();
    $this->actingAs($admin)->deleteJson("/api/v1/messages/{$foreign->id}")->assertNoContent();

    $this->actingAs($author)->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()
        ->assertJsonPath('data.0.deleted', true)
        ->assertJsonPath('data.0.body', null);
});

it('scopes messages to their room and cursor-paginates history', function (): void {
    [$room, $user] = roomWithMember();
    Message::factory()->for($room)->count(4)->create();

    $page1 = $this->actingAs($user)->getJson("/api/v1/rooms/{$room->id}/messages?limit=3")->assertOk();
    $cursor = $page1->json('meta.next_cursor');
    expect($cursor)->not->toBeNull();

    $page2 = $this->getJson("/api/v1/rooms/{$room->id}/messages?limit=3&cursor={$cursor}")->assertOk();
    $ids = array_merge(
        array_column($page1->json('data'), 'id'),
        array_column($page2->json('data'), 'id'),
    );
    expect($ids)->toHaveCount(count(array_unique($ids)));
});

it('toggles reactions for members only', function (): void {
    [$room, $member] = roomWithMember();
    $message = Message::factory()->for($room)->create();
    $outsider = User::factory()->create();

    $this->actingAs($member)->postJson("/api/v1/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertOk()
        ->assertJsonPath('data.count', 1)
        ->assertJsonPath('data.reacted_by_me', true);

    $this->postJson("/api/v1/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertOk()->assertJsonPath('data.count', 0);

    $this->actingAs($outsider)->postJson("/api/v1/messages/{$message->id}/reactions", ['emoji' => '👍'])
        ->assertStatus(403);
});

it('stores mentions of room members', function (): void {
    [$room, $user] = roomWithMember();
    $mentioned = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $mentioned->getKey()]);

    $this->actingAs($user)->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Ping!',
        'mentions' => [(string) $mentioned->getKey()],
    ])->assertCreated()->assertJsonPath('data.mentions.0', (string) $mentioned->getKey());
});
