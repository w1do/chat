<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Vendor\Identity\Application\Commands\CreateInvitedUserCommand;
use Vendor\Identity\Application\Handlers\Commands\CreateInvitedUserHandler;
use Vendor\Identity\Domain\Models\User;

it('registers the identity package config', function (): void {
    expect(config('identity.routes.enabled'))->toBeTrue()
        // Простые пароли разрешены: минимум задаёт установка (design, решение 5).
        ->and(config('identity.password.min_length'))->toBe(1);
});

it('creates users with ulid keys, a login and hidden credentials', function (): void {
    $user = User::factory()->create(['username' => 'alice']);

    expect($user->username)->toBe('alice')->and($user->email)->toBeNull();

    expect($user->externalId())->toMatch('/^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/')
        ->and($user->displayName())->toBe($user->name)
        ->and($user->toArray())->not->toHaveKeys(['password', 'remember_token']);
});

it('hashes passwords via the cast', function (): void {
    $user = User::factory()->create(['password' => 'super-secret-password']);

    expect($user->password)->not->toBe('super-secret-password')
        ->and(Hash::check('super-secret-password', $user->password))->toBeTrue();
});

it('accepts a short password and remembers who chose it', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'login' => 'korotkiy',
        'name' => 'Короткий',
        'password' => '1',
    ])->assertCreated();

    $user = User::query()->where('username', 'korotkiy')->sole();

    // Пароль выбрал человек — подсказка «задайте свой пароль» ему не нужна.
    expect($user->password_set_at)->not->toBeNull();
});

it('still requires a password to be present', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'login' => 'bezparolya',
        'name' => 'Без пароля',
        'password' => '',
    ])->assertStatus(422);
});

it('creates an account for an invited person with a readable login and a token', function (): void {
    $created = app(CreateInvitedUserHandler::class)
        ->handle(new CreateInvitedUserCommand('Надя'));

    expect($created->user->name)->toBe('Надя')
        ->and($created->user->username)->toContain('-')
        ->and($created->user->email)->toBeNull();

    // Своего пароля у приглашённого нет — войти он может только этим токеном.
    expect($created->token)->toBeString()->not->toBeEmpty();
    expect(PersonalAccessToken::findToken($created->token)?->tokenable_id)->toBe($created->user->id);

    // Пароль выдан системой: подсказка «задайте свой» человеку понадобится.
    expect(User::query()->whereKey($created->user->id)->value('password_set_at'))->toBeNull();
});

it('keeps generated logins unique', function (): void {
    $handler = app(CreateInvitedUserHandler::class);
    $command = new CreateInvitedUserCommand('Надя');

    $first = $handler->handle($command);
    $second = $handler->handle($command);

    expect($first->user->username)->not->toBe($second->user->username);
});
