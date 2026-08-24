<?php

declare(strict_types=1);

namespace Vendor\Chat\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vendor\Chat\Domain\Enums\RoomVisibility;
use Vendor\Chat\Domain\Models\Room;

/** @extends Factory<Room> */
class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'topic' => fake()->optional()->sentence(),
            'visibility' => RoomVisibility::PublicRoom,
            'created_by' => fn () => $this->newUserId(),
        ];
    }

    public function privateRoom(): static
    {
        return $this->state(fn (): array => ['visibility' => RoomVisibility::PrivateRoom]);
    }

    public function archived(): static
    {
        return $this->state(fn (): array => ['archived_at' => now()]);
    }

    private function newUserId(): string
    {
        // Конкретный класс пользователя принадлежит приложению/identity;
        // пакет chat знает только framework-конфиг auth-провайдера (§4.1).
        $model = config('auth.providers.users.model');

        return (string) $model::factory()->create()->getKey();
    }
}
