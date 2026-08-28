<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

it('binds the app user model through identity config', function (): void {
    expect(config('identity.user_model'))->toBe(User::class)
        ->and(config('auth.providers.users.model'))->toBe(User::class);
});

it('logs in through the composed application (happy path)', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ])->assertOk()->assertJsonPath('data.login', 'alice');
});

it('registers with a login only and renders the envelope on a taken login', function (): void {
    $this->postJson('/api/v1/auth/register', ['login' => 'alice', 'password' => 'correct-horse-battery'])
        ->assertCreated()
        ->assertJsonPath('data.login', 'alice')
        ->assertJsonPath('data.email', null);

    $this->postJson('/api/v1/auth/register', ['login' => 'alice', 'password' => 'correct-horse-battery'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonPath('details.errors.login.0', 'Такой логин уже занят.');
});

it('renders invalid credentials in the error envelope', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'nope',
    ])->assertStatus(401)->assertJsonPath('code', 'unauthenticated');
});

it('rate limits login attempts per email and renders the envelope', function (): void {
    RateLimiter::clear('identity-login');
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    foreach (range(1, 5) as $i) {
        $this->postJson('/api/v1/auth/login', ['login' => 'alice', 'password' => 'nope']);
    }

    $this->postJson('/api/v1/auth/login', ['login' => 'alice', 'password' => 'nope'])
        ->assertStatus(429)
        ->assertJsonPath('code', 'rate_limited')
        ->assertHeader('Retry-After');
});

it('performs a mutation with a token and without any CSRF handshake', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    // ValidateCsrfToken пропускает проверку в env=testing — эмулируем боевое
    // окружение, чтобы 419 действительно был бы возможен, будь стек session'ным.
    $this->app['env'] = 'local';

    $token = $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ], ['Referer' => 'https://spa.test'])->assertOk()->json('token');

    app('auth')->forgetGuards();

    // Ни handshake, ни X-XSRF-TOKEN: мутация проходит и не отвечает 419.
    $this->withToken($token)
        ->patchJson('/api/v1/me/profile', ['name' => 'Алиса'], ['Referer' => 'https://spa.test'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Алиса');
});

it('does not authenticate a browser session when no token is presented', function (): void {
    $user = User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    // Cookie сессии в запросе есть, bearer-токена — нет: fallback на
    // session-guard отсутствует (ADR-012).
    $this->actingAs($user, 'web');

    $this->getJson('/api/v1/me')->assertStatus(401)->assertJsonPath('code', 'unauthenticated');
});

it('answers a login with a token and no authentication cookie', function (): void {
    User::factory()->create(['username' => 'alice', 'password' => 'correct-horse-battery']);

    $response = $this->postJson('/api/v1/auth/login', [
        'login' => 'alice',
        'password' => 'correct-horse-battery',
    ])->assertOk();

    expect($response->json('token'))->toBeString()->not->toBeEmpty()
        ->and($response->headers->getCookies())->toBeEmpty();
});

it('does not expose the CSRF handshake of the removed cookie scheme', function (): void {
    // Маршрут выключен `sanctum.routes => false`: наружу не должно торчать
    // входа в механизм, которого больше нет (ADR-012).
    $this->get('/sanctum/csrf-cookie')->assertNotFound();
});

it('allows configured origins via CORS', function (): void {
    // Два origin в allowlist: CorsService с единственным origin шлёт его без
    // сверки (матчинг выполняет браузер), с несколькими — сверяет запрос.
    config()->set('cors.allowed_origins', ['https://chat.example.com', 'https://second.example.com']);

    $this->options('/api/v1/auth/login', [], [
        'Origin' => 'https://chat.example.com',
        'Access-Control-Request-Method' => 'POST',
    ])->assertHeader('Access-Control-Allow-Origin', 'https://chat.example.com');
});

it('allows the Authorization header in preflight for /me', function (): void {
    config()->set('cors.allowed_origins', ['https://chat.example.com', 'https://second.example.com']);

    $preflight = $this->options('/api/v1/me', [], [
        'Origin' => 'https://chat.example.com',
        'Access-Control-Request-Method' => 'GET',
        'Access-Control-Request-Headers' => 'authorization',
    ])->assertHeader('Access-Control-Allow-Origin', 'https://chat.example.com');

    expect(strtolower((string) $preflight->headers->get('Access-Control-Allow-Headers')))
        ->toContain('authorization');

    // Cookie в схеме нет — браузеру не обещают credentials.
    expect($preflight->headers->get('Access-Control-Allow-Credentials'))->toBeNull();
});

it('denies origins outside the CORS allowlist', function (): void {
    config()->set('cors.allowed_origins', ['https://chat.example.com', 'https://second.example.com']);

    $denied = $this->options('/api/v1/auth/login', [], [
        'Origin' => 'https://evil.example.com',
        'Access-Control-Request-Method' => 'POST',
    ]);

    expect($denied->headers->get('Access-Control-Allow-Origin'))->toBeNull();
});
