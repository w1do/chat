<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('resets the password of an existing user', function (): void {
    $user = User::factory()->create([
        'username' => 'ivan',
        'password' => 'old-password',
    ]);
    $originalToken = $user->remember_token;

    $this->artisan('admin:reset-password', ['username' => 'ivan', 'password' => 'brand-new-secret'])
        ->assertExitCode(0);

    $user->refresh();

    expect(Hash::check('brand-new-secret', (string) $user->password))->toBeTrue()
        ->and($user->password_set_at)->not->toBeNull()
        ->and($user->remember_token)->not->toBe($originalToken);
});

it('fails for an unknown username without changing anything', function (): void {
    $this->artisan('admin:reset-password', ['username' => 'ghost', 'password' => 'brand-new-secret'])
        ->assertExitCode(1);

    expect(User::query()->where('username', 'ghost')->exists())->toBeFalse();
});

it('rejects a password shorter than the configured minimum length', function (): void {
    config()->set('identity.password.min_length', 10);

    $user = User::factory()->create([
        'username' => 'ivan',
        'password' => 'old-password',
    ]);

    $this->artisan('admin:reset-password', ['username' => 'ivan', 'password' => 'short'])
        ->assertExitCode(1);

    $user->refresh();

    expect(Hash::check('old-password', (string) $user->password))->toBeTrue();
});
