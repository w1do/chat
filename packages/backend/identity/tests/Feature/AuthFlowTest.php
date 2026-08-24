<?php

declare(strict_types=1);

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Vendor\Identity\Domain\Models\User;

it('registers a user and starts a session', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Alice',
        'email' => 'alice@example.com',
        'password' => 'correct-horse-battery',
    ]);

    $response->assertCreated()->assertJsonPath('data.email', 'alice@example.com');
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
});

it('rejects duplicate email registration', function (): void {
    User::factory()->create(['email' => 'alice@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Alice',
        'email' => 'alice@example.com',
        'password' => 'correct-horse-battery',
    ])->assertStatus(422);
});

it('logs in with valid credentials', function (): void {
    $user = User::factory()->create(['password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'correct-horse-battery',
    ])->assertOk()->assertJsonPath('data.id', $user->externalId());

    $this->assertAuthenticatedAs($user);
});

it('rejects invalid credentials', function (): void {
    $user = User::factory()->create(['password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertStatus(401);

    $this->assertGuest();
});

it('logs out and invalidates the session', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/auth/logout')->assertNoContent();

    // Новый запрос без сессии — доступ к /me закрыт.
    $this->refreshApplication();
    $this->getJson('/api/v1/me')->assertStatus(401);
});

it('returns the authenticated user on /me and rejects guests', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->externalId());

    $this->refreshApplication();
    $this->getJson('/api/v1/me')->assertStatus(401);
});

it('updates the profile of the authenticated user', function (): void {
    $user = User::factory()->create(['name' => 'Old Name']);

    $this->actingAs($user)->patchJson('/api/v1/me/profile', [
        'name' => 'New Name',
        'locale' => 'ru',
        'timezone' => 'Europe/Moscow',
    ])->assertOk()->assertJsonPath('data.name', 'New Name');

    expect($user->refresh())
        ->name->toBe('New Name')
        ->locale->toBe('ru')
        ->timezone->toBe('Europe/Moscow');
});

it('rejects invalid profile input', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/me/profile', [
        'timezone' => 'Not/AZone',
    ])->assertStatus(422);
});

it('sends a reset link and answers identically for unknown email', function (): void {
    Notification::fake();
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertStatus(202);
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'ghost@example.com'])->assertStatus(202);

    Notification::assertSentTo($user, ResetPassword::class);
});

it('resets the password with a valid token and rejects a bad token', function (): void {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email,
        'token' => 'bad-token',
        'password' => 'brand-new-password-1',
    ])->assertStatus(422);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email,
        'token' => $token,
        'password' => 'brand-new-password-1',
    ])->assertNoContent();

    expect(Hash::check('brand-new-password-1', $user->refresh()->password))->toBeTrue();
});
