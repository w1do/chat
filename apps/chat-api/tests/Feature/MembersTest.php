<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Infrastructure\Broadcasting\RoomMemberChangedV1;

uses(RefreshDatabase::class);

function roomMemberWith(Room $room, RoomRole $role): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return $user;
}

it('lets the owner remove anyone but themselves', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $admin = roomMemberWith($room, RoomRole::Admin);
    $member = roomMemberWith($room, RoomRole::Member);

    $adminRow = $room->memberFor($admin);
    $memberRow = $room->memberFor($member);
    $ownerRow = $room->memberFor($owner);

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}")
        ->assertNoContent();
    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/{$adminRow->id}")
        ->assertNoContent();

    // Комната не остаётся без владельца.
    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/{$ownerRow->id}")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');

    $this->assertDatabaseMissing('room_members', ['id' => $memberRow->id]);
    $this->assertDatabaseMissing('room_members', ['id' => $adminRow->id]);
    $this->assertDatabaseHas('room_members', ['id' => $ownerRow->id]);
});

it('lets an admin remove plain members only', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $admin = roomMemberWith($room, RoomRole::Admin);
    $secondAdmin = roomMemberWith($room, RoomRole::Admin);
    $member = roomMemberWith($room, RoomRole::Member);

    $this->actingAs($admin)
        ->deleteJson("/api/v1/rooms/{$room->id}/members/{$room->memberFor($member)->id}")
        ->assertNoContent();

    $this->actingAs($admin)
        ->deleteJson("/api/v1/rooms/{$room->id}/members/{$room->memberFor($owner)->id}")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');

    $this->actingAs($admin)
        ->deleteJson("/api/v1/rooms/{$room->id}/members/{$room->memberFor($secondAdmin)->id}")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');

    $this->assertDatabaseHas('room_members', ['user_id' => $owner->getKey(), 'room_id' => $room->id]);
    $this->assertDatabaseHas('room_members', ['user_id' => $secondAdmin->getKey(), 'room_id' => $room->id]);
});

it('refuses removal to plain members and hides the room from outsiders', function (): void {
    $room = Room::factory()->privateRoom()->create();
    roomMemberWith($room, RoomRole::Owner);
    $member = roomMemberWith($room, RoomRole::Member);
    $target = roomMemberWith($room, RoomRole::Member);
    $outsider = User::factory()->create();

    $targetRow = $room->memberFor($target);

    $this->actingAs($member)->deleteJson("/api/v1/rooms/{$room->id}/members/{$targetRow->id}")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');

    $this->actingAs($outsider)->deleteJson("/api/v1/rooms/{$room->id}/members/{$targetRow->id}")
        ->assertStatus(404)->assertJsonPath('code', 'not_found');

    $this->assertDatabaseHas('room_members', ['id' => $targetRow->id]);
});

it('scopes removal to the room named in the path', function (): void {
    $roomA = Room::factory()->create();
    $roomB = Room::factory()->create();
    $owner = roomMemberWith($roomA, RoomRole::Owner);
    $foreignRow = RoomMember::factory()->for($roomB)->role(RoomRole::Member)->create();

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$roomA->id}/members/{$foreignRow->id}")
        ->assertStatus(404)->assertJsonPath('code', 'not_found');

    $this->assertDatabaseHas('room_members', ['id' => $foreignRow->id]);
});

it('tells the room about the removal and keeps it in the history', function (): void {
    Event::fake([RoomMemberChangedV1::class]);

    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $member = roomMemberWith($room, RoomRole::Member);
    $memberRow = $room->memberFor($member);

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}")
        ->assertNoContent();

    Event::assertDispatched(
        RoomMemberChangedV1::class,
        fn (RoomMemberChangedV1 $event): bool => $event->roomId === $room->id
            && $event->data['user_id'] === $member->getKey()
            && $event->data['action'] === 'removed'
            && $event->data['role'] === null,
    );

    // Системная запись — такая же, как при вступлении: событие и его участник.
    $this->assertDatabaseHas('messages', [
        'room_id' => $room->id,
        'kind' => 'system',
        'author_id' => $member->getKey(),
    ]);

    $entry = $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()
        ->json('data.0');

    expect($entry['kind'])->toBe('system')
        ->and($entry['payload']['event'])->toBe('member.removed')
        ->and($entry['payload']['actor_id'])->toBe($member->getKey());
});

it('shuts the room for the person who was removed', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $member = roomMemberWith($room, RoomRole::Member);
    $memberRow = $room->memberFor($member);

    // До исключения комната читается и в неё пишут.
    $this->actingAs($member)->getJson("/api/v1/rooms/{$room->id}/messages")->assertOk();
    $this->actingAs($member)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Пока здесь'])
        ->assertCreated();

    $this->actingAs($owner)->deleteJson("/api/v1/rooms/{$room->id}/members/{$memberRow->id}")
        ->assertNoContent();

    // После — как для любого постороннего.
    $this->actingAs($member)->getJson("/api/v1/rooms/{$room->id}")->assertStatus(403);
    $this->actingAs($member)->getJson("/api/v1/rooms/{$room->id}/messages")->assertStatus(403);
    $this->actingAs($member)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Ещё словечко'])
        ->assertStatus(403);

    // Комната пропадает и из его списка.
    $list = $this->actingAs($member)->getJson('/api/v1/rooms')->assertOk()->json('data');
    expect(collect($list)->pluck('id'))->not->toContain($room->id);
});

it('lets those who may invite look people up by nickname', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $admin = roomMemberWith($room, RoomRole::Admin);

    User::factory()->create(['username' => 'alice', 'name' => 'Алиса']);
    User::factory()->create(['username' => 'bob', 'name' => 'Боб']);

    $found = $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=@ali")
        ->assertOk()->json('data');

    expect($found)->toHaveCount(1)
        // Ник и имя — всё, что нужно для выбора.
        ->and(array_keys($found[0]))->toBe(['id', 'username', 'name', 'already_member'])
        ->and($found[0]['username'])->toBe('alice')
        ->and($found[0]['name'])->toBe('Алиса')
        ->and($found[0]['already_member'])->toBeFalse();

    $this->actingAs($admin)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=bob")
        ->assertOk()->assertJsonPath('data.0.username', 'bob');
});

it('marks people already in the room and stays quiet on a short query', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $owner = roomMemberWith($room, RoomRole::Owner);
    $inside = User::factory()->create(['username' => 'anna']);
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $inside->getKey()]);

    $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=anna")
        ->assertOk()->assertJsonPath('data.0.already_member', true);

    $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=a")
        ->assertOk()->assertJsonPath('data', []);
    $this->actingAs($owner)->getJson("/api/v1/rooms/{$room->id}/member-candidates")
        ->assertOk()->assertJsonPath('data', []);
});

it('keeps the nickname lookup away from those who cannot invite', function (): void {
    $room = Room::factory()->privateRoom()->create();
    roomMemberWith($room, RoomRole::Owner);
    $member = roomMemberWith($room, RoomRole::Member);
    $outsider = User::factory()->create();
    User::factory()->create(['username' => 'alice']);

    // Гостю без входа список ников не показывают вовсе.
    $this->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=alice")->assertStatus(401);

    $this->actingAs($member)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=alice")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');
    $this->actingAs($outsider)->getJson("/api/v1/rooms/{$room->id}/member-candidates?query=alice")
        ->assertStatus(403)->assertJsonPath('code', 'forbidden');
});
