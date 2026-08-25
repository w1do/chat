<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Infrastructure\Broadcasting\RoomDeletedV1;

uses(RefreshDatabase::class);

function memberOf(Room $room, RoomRole $role): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return $user;
}

it('creates a room and makes the creator its owner', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/rooms', [
        'name' => 'General',
        'visibility' => 'public',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'General')
        ->assertJsonPath('data.my_role', 'owner')
        ->assertJsonPath('data.member_count', 1);

    $this->assertDatabaseHas('room_members', [
        'user_id' => $user->getKey(),
        'role' => 'owner',
    ]);
});

it('validates room creation input', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/rooms', ['name' => '', 'visibility' => 'secret'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed');
});

it('hides private rooms from listings and direct access of non-members', function (): void {
    $user = User::factory()->create();
    $public = Room::factory()->create(['name' => 'Public room']);
    $private = Room::factory()->privateRoom()->create(['name' => 'Secret room']);

    $list = $this->actingAs($user)->getJson('/api/v1/rooms')->assertOk()->json('data');
    expect(collect($list)->pluck('id'))->toContain($public->id)->not->toContain($private->id);

    $this->getJson("/api/v1/rooms/{$private->id}")->assertStatus(403);
});

it('forbids room updates for plain members and guests', function (): void {
    $room = Room::factory()->create();
    memberOf($room, RoomRole::Owner);
    $member = memberOf($room, RoomRole::Member);
    $guest = User::factory()->create();

    $this->actingAs($member)->patchJson("/api/v1/rooms/{$room->id}", ['name' => 'X'])
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');
    $this->actingAs($guest)->patchJson("/api/v1/rooms/{$room->id}", ['name' => 'X'])->assertStatus(403);

    $admin = memberOf($room, RoomRole::Admin);
    $this->actingAs($admin)->patchJson("/api/v1/rooms/{$room->id}", ['name' => 'Renamed'])
        ->assertOk()->assertJsonPath('data.name', 'Renamed');
});

it('archives a room by owner and admin without touching its history', function (): void {
    $room = Room::factory()->create();
    $owner = memberOf($room, RoomRole::Owner);
    $admin = memberOf($room, RoomRole::Admin);
    $member = memberOf($room, RoomRole::Member);
    $message = Message::factory()->for($room)->create(['author_id' => $owner->getKey()]);

    $this->actingAs($member)->postJson("/api/v1/rooms/{$room->id}/archive")->assertStatus(403);
    $this->actingAs($admin)->postJson("/api/v1/rooms/{$room->id}/archive")->assertNoContent();

    expect($room->fresh()->isArchived())->toBeTrue();
    $this->assertDatabaseHas('messages', ['id' => $message->id]);
});

it('deletes a room permanently only by its owner', function (): void {
    $room = Room::factory()->create(['name' => 'Family']);
    $owner = memberOf($room, RoomRole::Owner);
    $admin = memberOf($room, RoomRole::Admin);
    $outsider = User::factory()->create();

    $message = Message::factory()->for($room)->create(['author_id' => $owner->getKey()]);

    $this->actingAs($admin)->deleteJson("/api/v1/rooms/{$room->id}")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');
    $this->actingAs($outsider)->deleteJson("/api/v1/rooms/{$room->id}")
        ->assertStatus(404)->assertJsonPath('code', 'not_found');

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}")->assertNoContent();

    $this->assertDatabaseMissing('rooms', ['id' => $room->id]);
    $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    $this->assertDatabaseMissing('room_members', ['room_id' => $room->id]);

    // Обращение к удалённой комнате — «не найдено», а не пустой список.
    $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}")->assertStatus(404);
    $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/messages")->assertStatus(404);
});

it('records room deletion in the audit log and tells the room about it', function (): void {
    Event::fake([RoomDeletedV1::class]);

    $room = Room::factory()->create(['name' => 'Family']);
    $owner = memberOf($room, RoomRole::Owner);

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}")->assertNoContent();

    Event::assertDispatched(RoomDeletedV1::class, fn (RoomDeletedV1 $event): bool => $event->roomId === $room->id);

    $this->assertDatabaseHas('audit_logs', [
        'action' => 'chat.room.deleted',
        'actor_id' => $owner->getKey(),
        'subject_id' => $room->id,
    ]);
});

it('renames a room and keeps the description optional', function (): void {
    $room = Room::factory()->create(['name' => 'Old', 'topic' => 'Was here']);
    $admin = memberOf($room, RoomRole::Admin);
    memberOf($room, RoomRole::Owner);

    $this->actingAs($admin)->patchJson("/api/v1/rooms/{$room->id}", ['name' => ''])
        ->assertStatus(422)->assertJsonPath('code', 'validation_failed')
        ->assertJsonPath('details.errors.name.0', fn (?string $m): bool => $m !== null);
    expect($room->fresh()->name)->toBe('Old');

    $this->actingAs($admin)->patchJson("/api/v1/rooms/{$room->id}", ['name' => 'Family', 'topic' => ''])
        ->assertOk()->assertJsonPath('data.name', 'Family')->assertJsonPath('data.topic', null);
});

it('handles invite, join, leave and duplicate-join conflicts', function (): void {
    $room = Room::factory()->create();
    $owner = memberOf($room, RoomRole::Owner);
    $invitee = User::factory()->create();
    $walkIn = User::factory()->create();

    // invite (owner) → 201; повторно → 409
    $this->actingAs($owner)->postJson("/api/v1/rooms/{$room->id}/members", ['user_id' => $invitee->getKey()])
        ->assertCreated()->assertJsonPath('data.role', 'member');
    $this->actingAs($owner)->postJson("/api/v1/rooms/{$room->id}/members", ['user_id' => $invitee->getKey()])
        ->assertStatus(409)->assertJsonPath('code', 'conflict');

    // member не может приглашать
    $this->actingAs($invitee)->postJson("/api/v1/rooms/{$room->id}/members", ['user_id' => $walkIn->getKey()])
        ->assertStatus(403);

    // self-join публичной комнаты; повторный join → 403 (уже член)
    $this->actingAs($walkIn)->postJson("/api/v1/rooms/{$room->id}/members/me")->assertCreated();
    $this->actingAs($walkIn)->postJson("/api/v1/rooms/{$room->id}/members/me")->assertStatus(403);

    // leave: member может, owner — нет
    $this->actingAs($walkIn)->deleteJson("/api/v1/rooms/{$room->id}/members/me")->assertNoContent();
    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/me")->assertStatus(403);
});

it('changes member roles only by the owner and never the owner row', function (): void {
    $room = Room::factory()->create();
    $owner = memberOf($room, RoomRole::Owner);
    $admin = memberOf($room, RoomRole::Admin);
    $member = memberOf($room, RoomRole::Member);
    $memberRow = $room->memberFor($member);
    $ownerRow = $room->memberFor($owner);

    $this->actingAs($admin)->patchJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}", ['role' => 'admin'])
        ->assertStatus(403);

    $this->actingAs($owner)->patchJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}", ['role' => 'admin'])
        ->assertOk()->assertJsonPath('data.role', 'admin');

    $this->actingAs($owner)->patchJson("/api/v1/rooms/{$room->id}/members/{$ownerRow->id}", ['role' => 'member'])
        ->assertStatus(403);

    $this->actingAs($owner)->patchJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}", ['role' => 'owner'])
        ->assertStatus(422);
});

it('scopes member bindings to the room', function (): void {
    $roomA = Room::factory()->create();
    $roomB = Room::factory()->create();
    $ownerA = memberOf($roomA, RoomRole::Owner);
    memberOf($roomB, RoomRole::Owner);
    $foreignRow = RoomMember::factory()->for($roomB)->role(RoomRole::Member)->create();

    // Член другой комнаты недостижим через /rooms/{roomA}/members/{member}
    $this->actingAs($ownerA)->patchJson("/api/v1/rooms/{$roomA->id}/members/{$foreignRow->id}", ['role' => 'admin'])
        ->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('requires authentication for all room endpoints', function (): void {
    $room = Room::factory()->create();

    $this->getJson('/api/v1/rooms')->assertStatus(401);
    $this->postJson('/api/v1/rooms', [])->assertStatus(401);
    $this->getJson("/api/v1/rooms/{$room->id}/members")->assertStatus(401);
});

it('reports unread counters in the room list and clears them on read', function (): void {
    $room = Room::factory()->create();
    $reader = memberOf($room, RoomRole::Member);
    $author = memberOf($room, RoomRole::Owner);

    $messages = Message::factory()
        ->for($room)
        ->count(3)
        ->create(['author_id' => $author->getKey()])
        ->sortBy('id')
        ->values();

    $list = $this->actingAs($reader)->getJson('/api/v1/rooms')->assertOk();
    expect(collect($list->json('data'))->firstWhere('id', $room->id)['unread_count'])->toBe(3);

    $this->postJson("/api/v1/rooms/{$room->id}/read", ['last_read_message_id' => $messages[1]->id])
        ->assertNoContent();

    $after = $this->getJson('/api/v1/rooms')->assertOk();
    expect(collect($after->json('data'))->firstWhere('id', $room->id)['unread_count'])->toBe(1);

    // Свои сообщения не считаются непрочитанными.
    Message::factory()->for($room)->create(['author_id' => $reader->getKey()]);
    $own = $this->getJson('/api/v1/rooms')->assertOk();
    expect(collect($own->json('data'))->firstWhere('id', $room->id)['unread_count'])->toBe(1);
});

it('does not report unread counters for rooms the user has not joined', function (): void {
    $room = Room::factory()->create();
    memberOf($room, RoomRole::Owner);
    $outsider = User::factory()->create();

    $list = $this->actingAs($outsider)->getJson('/api/v1/rooms')->assertOk();

    expect(collect($list->json('data'))->firstWhere('id', $room->id)['unread_count'])->toBeNull();
});
