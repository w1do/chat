<?php

declare(strict_types=1);

namespace Vendor\Identity\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Vendor\Identity\Domain\Models\User;

class UserFactory extends Factory
{
    public function modelName(): string
    {
        return config('identity.user_model') ?? User::class;
    }

    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'name' => fake()->name(),
            // Почта необязательна: аккаунт живёт и без неё (design 1b).
            'email' => null,
            'email_verified_at' => null,
            'password' => 'password',
            'locale' => 'en',
            'timezone' => 'UTC',
            'remember_token' => Str::random(10),
        ];
    }

    public function withEmail(?string $email = null): static
    {
        return $this->state(fn (): array => [
            'email' => $email ?? fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
        ]);
    }
}
