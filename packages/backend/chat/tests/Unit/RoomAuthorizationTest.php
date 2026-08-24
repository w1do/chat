<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MembershipPolicy;
use Vendor\Chat\Domain\Policies\RoomPolicy;
use Vendor\Identity\Domain\Models\User;

function makeRoomWith(RoomRole $role): array
{
    $room = Room::factory()->privateRoom()->create();
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role($role)->create(['user_id' => $user->getKey()]);

    return [$room->fresh(), $user];
}

dataset('room matrix', [
    // [роль или null (гость), update, archive, invite, changeRole]
    'owner' => [RoomRole::Owner, true, true, true, true],
    'admin' => [RoomRole::Admin, true, false, true, false],
    'member' => [RoomRole::Member, false, false, false, false],
    'guest' => [null, false, false, false, false],
]);

it('enforces the room authorization matrix', function (?RoomRole $role, bool $update, bool $archive, bool $invite, bool $changeRole): void {
    if ($role === null) {
        $room = Room::factory()->privateRoom()->create();
        $user = User::factory()->create();
    } else {
        [$room, $user] = makeRoomWith($role);
    }

    $target = RoomMember::factory()->for($room)->role(RoomRole::Member)->create();

    $roomPolicy = new RoomPolicy;
    $membershipPolicy = new MembershipPolicy;

    expect($roomPolicy->update($user, $room))->toBe($update)
        ->and($roomPolicy->archive($user, $room))->toBe($archive)
        ->and($membershipPolicy->invite($user, $room))->toBe($invite)
        ->and($membershipPolicy->changeRole($user, $room, $target))->toBe($changeRole);
})->with('room matrix');

it('hides private rooms from non-members but shows public ones', function (): void {
    $user = User::factory()->create();
    $public = Room::factory()->create();
    $private = Room::factory()->privateRoom()->create();

    $policy = new RoomPolicy;

    expect($policy->view($user, $public))->toBeTrue()
        ->and($policy->view($user, $private))->toBeFalse();

    $visible = Room::query()->visibleTo($user)->pluck('id');
    expect($visible)->toContain($public->id)->not->toContain($private->id);
});

it('lets members join public rooms only once and forbids owner leave', function (): void {
    [$room, $owner] = makeRoomWith(RoomRole::Owner);
    $publicRoom = Room::factory()->create();
    $user = User::factory()->create();

    $policy = new MembershipPolicy;

    expect($policy->join($user, $publicRoom))->toBeTrue()
        ->and($policy->join($user, $room))->toBeFalse()       // private
        ->and($policy->leave($owner, $room))->toBeFalse();    // owner не уходит

    RoomMember::factory()->for($publicRoom)->create(['user_id' => $user->getKey()]);
    expect($policy->join($user, $publicRoom->fresh()))->toBeFalse() // уже член
        ->and($policy->leave($user, $publicRoom->fresh()))->toBeTrue();
});

it('keeps a single owner per room at the database level', function (): void {
    $room = Room::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create();

    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create();
})->throws(QueryException::class);

it('changes roles except owner via the handler policy pair', function (): void {
    [$room, $owner] = makeRoomWith(RoomRole::Owner);
    $ownerMember = $room->memberFor($owner);
    $target = RoomMember::factory()->for($room)->role(RoomRole::Member)->create();

    $policy = new MembershipPolicy;

    expect($policy->changeRole($owner, $room, $target))->toBeTrue()
        ->and($policy->changeRole($owner, $room, $ownerMember))->toBeFalse();
});
