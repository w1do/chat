<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

it('marks the last seen moment on an authenticated request', function (): void {
    $user = User::factory()->create(['last_seen_at' => null]);

    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();

    expect($user->fresh()->last_seen_at)->not->toBeNull();
});

it('does not write the last seen moment again within the throttle window', function (): void {
    config(['identity.presence.touch_throttle_seconds' => 60]);
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();
    $first = $user->fresh()->last_seen_at;

    $this->travel(5)->seconds();
    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();

    expect($user->fresh()->last_seen_at?->toIso8601String())->toBe($first?->toIso8601String());
});

it('writes the last seen moment again once the window has passed', function (): void {
    config(['identity.presence.touch_throttle_seconds' => 60]);
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();
    $first = $user->fresh()->last_seen_at;

    // Окно истекло вместе с записью в кэше — следующее действие снова пишется.
    $this->travel(61)->seconds();
    Cache::flush();
    $this->actingAs($user)->getJson('/api/v1/me')->assertOk();

    expect($user->fresh()->last_seen_at?->getTimestamp())->toBeGreaterThan((int) $first?->getTimestamp());
});

it('leaves the last seen moment alone for anonymous requests', function (): void {
    $user = User::factory()->create(['last_seen_at' => null]);

    $this->getJson('/api/v1/me')->assertUnauthorized();

    expect($user->fresh()->last_seen_at)->toBeNull();
});

it('reports presence for room members', function (): void {
    $room = Room::factory()->create();
    $me = User::factory()->create();
    $offline = User::factory()->create(['last_seen_at' => now()->subDay()]);
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create(['user_id' => $me->getKey()]);
    RoomMember::factory()->for($room)->create(['user_id' => $offline->getKey()]);

    $response = $this->actingAs($me)->getJson("/api/v1/rooms/{$room->id}/members")->assertOk();

    $members = collect($response->json('data'))->keyBy('user_id');

    expect($members[(string) $me->getKey()]['is_online'])->toBeTrue()
        ->and($members[(string) $offline->getKey()]['is_online'])->toBeFalse()
        ->and($members[(string) $offline->getKey()]['last_seen_at'])->not->toBeNull()
        // Ник участника нужен упоминанию `@username` (spec chat/mention-autocomplete).
        ->and($members[(string) $offline->getKey()]['username'])->toBe($offline->username);
});

it('reports presence in the user profile', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.is_online', true)
        ->assertJsonStructure(['data' => ['is_online', 'last_seen_at']]);
});
