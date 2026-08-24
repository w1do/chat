<?php

declare(strict_types=1);

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Vendor\Identity\Domain\Models\User;

it('registers with a login only and starts a session', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.login', 'alice')
        // Почта не запрашивается и остаётся пустой до настроек.
        ->assertJsonPath('data.email', null)
        // Отображаемое имя по умолчанию — сам логин.
        ->assertJsonPath('data.name', 'alice')
        // Значения по умолчанию приходят заполненными.
        ->assertJsonPath('data.locale', 'en')
        ->assertJsonPath('data.timezone', 'UTC');

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['username' => 'alice', 'email' => null]);
});

it('rejects a taken login and names the field', function (): void {
    User::factory()->create(['username' => 'alice']);

    $this->postJson('/api/v1/auth/register', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
        // В testbench-приложении пакета ошибка в стандартном формате Laravel;
        // единый envelope проверяется интеграционным тестом приложения.
    ])->assertStatus(422)->assertJsonPath('errors.login.0', 'Такой логин уже занят.');
});

it('rejects malformed logins', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'login' => 'алиса раз',
        'password' => 'correct-horse-battery',
    ])->assertStatus(422);
});

it('logs in with login and password', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ])->assertOk()->assertJsonPath('data.id', $user->externalId());

    $this->assertAuthenticatedAs($user);
});

it('rejects invalid credentials without revealing whether the login exists', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $known = $this->postJson('/api/v1/auth/login', ['login' => 'alice', 'password' => 'wrong-password'])
        ->assertStatus(401);
    $unknown = $this->postJson('/api/v1/auth/login', ['login' => 'ghost', 'password' => 'wrong-password'])
        ->assertStatus(401);

    expect($known->json('code'))->toBe($unknown->json('code'))
        ->and($known->json('message'))->toBe($unknown->json('message'));

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
    $user = User::factory()->withEmail()->create();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertStatus(202);
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'ghost@example.com'])->assertStatus(202);

    Notification::assertSentTo($user, ResetPassword::class);
});

it('resets the password with a valid token and rejects a bad token', function (): void {
    $user = User::factory()->withEmail()->create();
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

it('does not send recovery mail for an account without an email', function (): void {
    Notification::fake();
    $user = User::factory()->create(['username' => 'nomail']);

    // Ответ одинаков (не раскрываем данные), но письма нет — интерфейс
    // объясняет, что для восстановления нужна почта в настройках.
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
        ->assertStatus(202);

    Notification::assertNothingSent();
    expect($user->refresh()->email)->toBeNull();
});

it('adds and clears the email from settings', function (): void {
    $user = User::factory()->create(['username' => 'alice']);

    $this->actingAs($user)->patchJson('/api/v1/me/email', ['email' => 'alice@example.com'])
        ->assertOk()
        ->assertJsonPath('data.email', 'alice@example.com');

    expect($user->refresh()->email)->toBe('alice@example.com');

    $this->patchJson('/api/v1/me/email', ['email' => null])->assertOk()->assertJsonPath('data.email', null);
    expect($user->refresh()->email)->toBeNull();
});

it('rejects an email already used by someone else', function (): void {
    User::factory()->withEmail('taken@example.com')->create();
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/v1/me/email', ['email' => 'taken@example.com'])
        ->assertStatus(422);
});

it('changes the password only with the correct current one', function (): void {
    $user = User::factory()->create(['password' => 'old-password-value']);

    $this->actingAs($user)->patchJson('/api/v1/me/password', [
        'current_password' => 'wrong-password',
        'password' => 'brand-new-password-1',
    ])->assertStatus(422);

    $this->patchJson('/api/v1/me/password', [
        'current_password' => 'old-password-value',
        'password' => 'brand-new-password-1',
    ])->assertNoContent();

    expect(Hash::check('brand-new-password-1', $user->refresh()->password))->toBeTrue();
});

it('requires authentication for email and password changes', function (): void {
    $this->patchJson('/api/v1/me/email', ['email' => 'x@example.com'])->assertStatus(401);
    $this->patchJson('/api/v1/me/password', ['current_password' => 'a', 'password' => 'b'])->assertStatus(401);
});
