<?php

declare(strict_types=1);

use Vendor\Chat\Application\DTOs\MemberCandidateData;
use Vendor\Chat\Application\Handlers\Queries\SearchMemberCandidatesHandler;
use Vendor\Chat\Application\Queries\SearchMemberCandidatesQuery;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Identity\Domain\Models\User;

function search(Room $room, string $term): array
{
    return app(SearchMemberCandidatesHandler::class)->handle(
        new SearchMemberCandidatesQuery($room->id, $term),
    );
}

it('finds people by the start of the nickname, with or without the at sign', function (): void {
    $room = Room::factory()->privateRoom()->create();
    User::factory()->create(['username' => 'alice', 'name' => 'Алиса']);
    User::factory()->create(['username' => 'alicia', 'name' => 'Алисия']);
    User::factory()->create(['username' => 'bob', 'name' => 'Боб']);

    expect(collect(search($room, '@ali'))->pluck('username')->all())->toBe(['alice', 'alicia'])
        ->and(collect(search($room, 'ali'))->pluck('username')->all())->toBe(['alice', 'alicia'])
        // Регистр не важен, а вот начало ника — важно.
        ->and(collect(search($room, 'ALI'))->pluck('username')->all())->toBe(['alice', 'alicia'])
        ->and(search($room, 'lice'))->toBe([]);
});

it('says nothing at all for an empty or too short query', function (): void {
    $room = Room::factory()->privateRoom()->create();
    User::factory()->create(['username' => 'alice']);

    expect(search($room, ''))->toBe([])
        ->and(search($room, '@'))->toBe([])
        ->and(search($room, 'a'))->toBe([])
        ->and(search($room, '@a'))->toBe([])
        ->and(search($room, '  '))->toBe([]);
});

it('never hands out more than ten people at once', function (): void {
    $room = Room::factory()->privateRoom()->create();
    foreach (range(10, 25) as $index) {
        User::factory()->create(['username' => 'team'.$index]);
    }

    expect(search($room, 'team'))->toHaveCount(10);
});

it('marks the people who are already in the room', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $inside = User::factory()->create(['username' => 'anna', 'name' => 'Анна']);
    User::factory()->create(['username' => 'anton', 'name' => 'Антон']);
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $inside->getKey()]);

    $found = collect(search($room, 'an'))->keyBy('username');

    expect($found->get('anna')->alreadyMember)->toBeTrue()
        ->and($found->get('anton')->alreadyMember)->toBeFalse()
        // Членство соседней комнаты к этой не относится.
        ->and(collect(search(Room::factory()->create(), 'an'))->keyBy('username')->get('anna')->alreadyMember)
        ->toBeFalse();
});

it('answers with the nickname and the name only', function (): void {
    $room = Room::factory()->privateRoom()->create();
    User::factory()->withEmail('alice@example.test')->create(['username' => 'alice', 'name' => 'Алиса']);

    $candidate = search($room, 'alice')[0];

    expect($candidate)->toBeInstanceOf(MemberCandidateData::class)
        ->and($candidate->username)->toBe('alice')
        ->and($candidate->name)->toBe('Алиса')
        ->and(array_keys(get_object_vars($candidate)))->toBe(['id', 'username', 'name', 'alreadyMember']);
});

it('treats wildcards in the query as ordinary characters', function (): void {
    $room = Room::factory()->privateRoom()->create();
    User::factory()->create(['username' => 'alice']);
    User::factory()->create(['username' => 'a_b']);

    expect(collect(search($room, 'a_'))->pluck('username')->all())->toBe(['a_b'])
        ->and(search($room, '%a'))->toBe([]);
});
