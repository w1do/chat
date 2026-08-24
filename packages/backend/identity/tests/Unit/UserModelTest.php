<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Hash;
use Vendor\Identity\Domain\Models\User;

it('registers the identity package config', function (): void {
    expect(config('identity.routes.enabled'))->toBeTrue()
        ->and(config('identity.password.min_length'))->toBe(10);
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
