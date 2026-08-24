<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Vendor\Identity\Domain\Models\User;

function seedNotification(User $user, string $category = 'message', ?string $readAt = null): string
{
    $id = (string) Str::uuid();

    DB::table('notifications')->insert([
        'id' => $id,
        'type' => "chat.{$category}",
        'notifiable_type' => 'user',
        'notifiable_id' => $user->getKey(),
        'data' => json_encode([
            'category' => $category,
            'room_id' => 'room-1',
            'room_name' => 'Общая',
            'actor_name' => 'Алиса',
            'preview' => 'Привет',
        ], JSON_UNESCAPED_UNICODE),
        'group_key' => "{$category}:room-1",
        'group_count' => 1,
        'read_at' => $readAt,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $id;
}

it('lists notifications with the unread counter', function (): void {
    $user = User::factory()->create();
    seedNotification($user);
    seedNotification($user, 'mention');
    seedNotification($user, 'message', readAt: (string) now());

    $this->actingAs($user)->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.unread', 2)
        ->assertJsonPath('data.0.room_name', 'Общая');

    $this->getJson('/api/v1/notifications?unread=1')->assertOk()->assertJsonCount(2, 'data');
});

it('marks selected notifications and everything read', function (): void {
    $user = User::factory()->create();
    $first = seedNotification($user);
    seedNotification($user, 'mention');

    $this->actingAs($user)->postJson('/api/v1/notifications/read', ['ids' => [$first]])
        ->assertOk()->assertJsonPath('data.marked', 1);

    $this->postJson('/api/v1/notifications/read')->assertOk()->assertJsonPath('data.marked', 1);

    $this->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('meta.unread', 0);
});

it('never touches notifications of another user', function (): void {
    $user = User::factory()->create();
    $stranger = User::factory()->create();
    $foreign = seedNotification($stranger);

    $this->actingAs($user)->postJson('/api/v1/notifications/read', ['ids' => [$foreign]])
        ->assertOk()->assertJsonPath('data.marked', 0);

    expect(DB::table('notifications')->where('id', $foreign)->value('read_at'))->toBeNull();

    // Чужие записи не видны и в ленте.
    $this->getJson('/api/v1/notifications')->assertOk()->assertJsonCount(0, 'data');
});

it('returns preferences with defaults and locked entries', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/notification-preferences')->assertOk();
    $preferences = collect($response->json('data'));

    expect($preferences->firstWhere(fn ($p) => $p['category'] === 'message' && $p['channel'] === 'mail')['enabled'])
        ->toBeFalse()
        ->and($preferences->firstWhere(fn ($p) => $p['category'] === 'mention' && $p['channel'] === 'mail')['enabled'])
        ->toBeTrue()
        ->and($preferences->firstWhere(fn ($p) => $p['category'] === 'security' && $p['channel'] === 'database')['locked'])
        ->toBeTrue();
});

it('updates preferences and refuses to silence mandatory feed entries', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/notification-preferences', [
        'preferences' => [['category' => 'message', 'channel' => 'mail', 'enabled' => true]],
    ])->assertOk();

    $this->assertDatabaseHas('notification_preferences', [
        'user_id' => $user->getKey(),
        'category' => 'message',
        'channel' => 'mail',
        'enabled' => true,
    ]);

    $this->patchJson('/api/v1/notification-preferences', [
        'preferences' => [['category' => 'security', 'channel' => 'database', 'enabled' => false]],
    ])->assertStatus(422);
});

it('validates preference input', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/notification-preferences', [
        'preferences' => [['category' => 'unknown', 'channel' => 'mail', 'enabled' => true]],
    ])->assertStatus(422);

    $this->patchJson('/api/v1/notification-preferences', ['preferences' => []])->assertStatus(422);
});

it('requires authentication everywhere', function (): void {
    $this->getJson('/api/v1/notifications')->assertStatus(401);
    $this->postJson('/api/v1/notifications/read')->assertStatus(401);
    $this->getJson('/api/v1/notification-preferences')->assertStatus(401);
    $this->patchJson('/api/v1/notification-preferences', ['preferences' => []])->assertStatus(401);
});
