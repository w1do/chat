<?php

declare(strict_types=1);

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Orchestra\Testbench\TestCase;
use Vendor\Identity\Domain\Models\User;

/** Вход и токен, которым дальше представляется клиент. */
function login(string $login = 'alice', string $password = 'correct-horse-battery'): string
{
    return test()->postJson('/api/v1/auth/login', ['login' => $login, 'password' => $password])
        ->assertOk()
        ->json('token');
}

/**
 * Следующий запрос приходит как с нового соединения: guard'ы сбрасываются так
 * же, как между запросами у worker'а в бою. Внутри одного теста контейнер
 * живёт дальше, и без сброса пользователь прошлого запроса остался бы в
 * памяти guard'а. Пустой токен означает запрос без заголовка.
 */
function device(string $token = ''): TestCase
{
    app('auth')->forgetGuards();

    return test()->withToken($token);
}

it('registers with a login only and issues a token', function (): void {
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

    expect($response->json('token'))->toBeString()->not->toBeEmpty();
    $this->assertDatabaseHas('users', ['username' => 'alice', 'email' => null]);

    // Регистрация — тот же вход: ни cookie, ни сессии (ADR-012).
    expect($response->headers->getCookies())->toBeEmpty();
    expect(app('session.store')->isStarted())->toBeFalse();
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

it('logs in with login and password and answers with a token, not a cookie', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $response = $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ])->assertOk()->assertJsonPath('data.id', $user->externalId());

    expect($response->json('token'))->toBeString()->not->toBeEmpty();

    // Ни одной cookie аутентификации и ни одной начатой сессии: вход больше
    // не серверное состояние (spec identity/token-authentication).
    expect($response->headers->getCookies())->toBeEmpty();
    expect(app('session.store')->isStarted())->toBeFalse();
    $this->assertGuest('web');
});

it('issues a token without an expiry and leaves other devices alone', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $first = login();
    $second = login();

    expect($first)->not->toBe($second);
    $this->assertDatabaseCount('personal_access_tokens', 2);
    expect(PersonalAccessToken::query()->whereNotNull('expires_at')->count())->toBe(0);
    expect(PersonalAccessToken::findToken($first)?->tokenable_id)->toBe($user->getKey());

    // Оба устройства авторизованы своим токеном.
    device($first)->getJson('/api/v1/me')->assertOk();
    device($second)->getJson('/api/v1/me')->assertOk();
});

it('ignores a remember flag that is no longer part of the contract', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
        'remember' => true,
    ])->assertOk();
});

it('restores the logged-in user by token after the server state is gone', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);
    $token = login();

    // Серверного состояния входа нет вовсе: у клиента только токен.
    device($token)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->externalId());
});

it('rejects a protected request without an Authorization header', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);
    login();

    device()->getJson('/api/v1/me')->assertStatus(401);
});

it('does not authorize a revoked token', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);
    $token = login();

    PersonalAccessToken::findToken($token)->delete();

    device($token)->getJson('/api/v1/me')->assertStatus(401);
});

it('rejects invalid credentials without revealing whether the login exists', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $known = $this->postJson('/api/v1/auth/login', ['login' => 'alice', 'password' => 'wrong-password'])
        ->assertStatus(401);
    $unknown = $this->postJson('/api/v1/auth/login', ['login' => 'ghost', 'password' => 'wrong-password'])
        ->assertStatus(401);

    expect($known->json('code'))->toBe($unknown->json('code'))
        ->and($known->json('message'))->toBe($unknown->json('message'))
        ->and($known->json('token'))->toBeNull();

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('logs out only the device that asked and survives a repeat', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);
    $phone = login();
    $desktop = login();

    device($phone)->postJson('/api/v1/auth/logout')->assertNoContent();

    // Телефон вышел, компьютер остался вошедшим.
    device($phone)->getJson('/api/v1/me')->assertStatus(401);
    device($desktop)->getJson('/api/v1/me')->assertOk();

    // Повтор выхода уже недействительным токеном — отказ, а не ошибка сервера.
    device($phone)->postJson('/api/v1/auth/logout')->assertStatus(401);
});

it('returns the authenticated user on /me and rejects guests', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->externalId());

    $this->refreshApplication();
    $this->getJson('/api/v1/me')->assertStatus(401);
});

it('does not fall back to a browser session when no token is presented', function (): void {
    $user = User::factory()->create();

    // Человек «вошёл» session-guard'ом — для API это ничего не значит.
    $this->actingAs($user, 'web');

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

it('revokes every token of the person whose password was reset', function (): void {
    $user = User::factory()->withEmail()->create([
        'username' => 'alice',
        'password' => 'correct-horse-battery',
    ]);
    $phone = login();
    $desktop = login();

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email,
        'token' => Password::broker()->createToken($user),
        'password' => 'brand-new-password-1',
    ])->assertNoContent();

    device($phone)->getJson('/api/v1/me')->assertStatus(401);
    device($desktop)->getJson('/api/v1/me')->assertStatus(401);
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

it('keeps the current device signed in and drops the others on a password change', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'old-password-value']);
    $desktop = login('alice', 'old-password-value');
    $phone = login('alice', 'old-password-value');

    device($desktop)->patchJson('/api/v1/me/password', [
        'current_password' => 'old-password-value',
        'password' => 'brand-new-password-1',
    ])->assertNoContent();

    // Инициатор остаётся вошедшим, второе устройство — нет.
    device($desktop)->getJson('/api/v1/me')->assertOk();
    device($phone)->getJson('/api/v1/me')->assertStatus(401);
});

it('accepts a short password when the installation asks for nothing more', function (): void {
    // Ровно случай из отчёта: «123» сервер принимает, значит и форма обязана.
    config()->set('identity.password.min_length', 1);
    $user = User::factory()->create(['password' => 'old-password-value']);

    $this->actingAs($user)->patchJson('/api/v1/me/password', [
        'current_password' => 'old-password-value',
        'password' => '123',
    ])->assertNoContent();

    expect(Hash::check('123', $user->refresh()->password))->toBeTrue();
});

it('follows the installation when it asks for a longer password', function (): void {
    config()->set('identity.password.min_length', 12);
    $user = User::factory()->create(['password' => 'old-password-value']);

    $this->actingAs($user)->patchJson('/api/v1/me/password', [
        'current_password' => 'old-password-value',
        'password' => '123',
    ])->assertStatus(422);

    expect(Hash::check('old-password-value', $user->refresh()->password))->toBeTrue();
});

it('requires authentication for email and password changes', function (): void {
    $this->patchJson('/api/v1/me/email', ['email' => 'x@example.com'])->assertStatus(401);
    $this->patchJson('/api/v1/me/password', ['current_password' => 'a', 'password' => 'b'])->assertStatus(401);
});
