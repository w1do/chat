<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

/** Комната с владельцем и готовым приглашением: [room, host, token]. */
function roomWithInvite(): array
{
    $room = Room::factory()->privateRoom()->create(['name' => 'Семья']);
    $host = User::factory()->create(['name' => 'Алексей']);
    RoomMember::factory()->for($room)->create(['user_id' => $host->getKey(), 'role' => RoomRole::Owner]);

    $token = test()->actingAs($host)
        ->postJson("/api/v1/rooms/{$room->id}/invites")
        ->assertCreated()
        ->json('data.token');

    // actingAs держит пользователя до конца теста — гость должен приходить
    // неаутентифицированным, иначе проверяется не тот путь.
    app('auth')->forgetGuards();
    test()->flushSession();

    return [$room, $host, $token];
}

it('lets a member create an invite and a stranger refuse', function (): void {
    [$room, , $token] = roomWithInvite();

    expect($token)->toBeString()->not->toBeEmpty();

    $this->actingAs(User::factory()->create())
        ->postJson("/api/v1/rooms/{$room->id}/invites")
        ->assertStatus(403);
});

it('requires authentication to create an invite', function (): void {
    $room = Room::factory()->create();

    $this->postJson("/api/v1/rooms/{$room->id}/invites")->assertStatus(401);
});

it('shows the visitor which room they are invited to', function (): void {
    [, $host, $token] = roomWithInvite();

    $this->getJson("/api/v1/invites/{$token}")
        ->assertOk()
        ->assertJsonPath('data.room_name', 'Семья')
        ->assertJsonPath('data.invited_by_name', $host->name)
        ->assertJsonPath('data.token', null);
});

it('creates an account and puts the person straight into the room', function (): void {
    [$room, , $token] = roomWithInvite();

    $response = $this->postJson("/api/v1/invites/{$token}/accept", ['name' => 'Надя'])
        ->assertCreated()
        ->assertJsonPath('data.room_id', $room->id)
        ->assertJsonPath('data.created_account', true);

    $guest = User::query()->where('name', 'Надя')->sole();

    expect($room->members()->where('user_id', $guest->getKey())->exists())->toBeTrue()
        // Пароль выдан системой: человек ещё сделает аккаунт своим.
        ->and($guest->password_set_at)->toBeNull()
        ->and($guest->email)->toBeNull();

    // Сессия уже открыта: гость сразу пишет в комнату.
    $this->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет всем!'])->assertCreated();

    expect($response->json('data.room_id'))->toBe($room->id);
});

it('refuses an unnamed guest and creates nothing', function (): void {
    [, , $token] = roomWithInvite();
    $before = User::query()->count();

    $this->postJson("/api/v1/invites/{$token}/accept", ['name' => ' '])->assertStatus(422);

    expect(User::query()->count())->toBe($before);
});

it('adds an already signed-in user without a second account', function (): void {
    [$room, , $token] = roomWithInvite();
    $existing = User::factory()->create();
    $before = User::query()->count();

    $this->actingAs($existing)
        ->postJson("/api/v1/invites/{$token}/accept")
        ->assertOk()
        ->assertJsonPath('data.created_account', false);

    expect(User::query()->count())->toBe($before)
        ->and($room->members()->where('user_id', $existing->getKey())->count())->toBe(1);
});

it('leaves nothing behind when the invite is dead', function (): void {
    [, , $token] = roomWithInvite();
    RoomInvite::query()->sole()->forceFill(['revoked_at' => now()])->save();
    $before = User::query()->count();

    $this->postJson("/api/v1/invites/{$token}/accept", ['name' => 'Поздний гость'])->assertStatus(404);

    // Транзакция откатилась: аккаунта без комнаты не осталось.
    expect(User::query()->count())->toBe($before);
});

it('revokes an invite so the link stops working', function (): void {
    [$room, $host, $token] = roomWithInvite();
    $invite = RoomInvite::query()->sole();

    $this->actingAs($host)->deleteJson("/api/v1/invites/{$invite->id}")->assertNoContent();

    $this->getJson("/api/v1/invites/{$token}")->assertStatus(404);
    $this->postJson("/api/v1/invites/{$token}/accept", ['name' => 'Гость'])->assertStatus(404);
    expect($room->members()->count())->toBe(1);
});
