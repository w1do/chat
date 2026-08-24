<?php

declare(strict_types=1);

namespace Vendor\Chat\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

/** @extends Factory<RoomMember> */
class RoomMemberFactory extends Factory
{
    protected $model = RoomMember::class;

    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'user_id' => fn () => $this->newUserId(),
            'role' => RoomRole::Member,
            'joined_at' => now(),
        ];
    }

    public function role(RoomRole $role): static
    {
        return $this->state(fn (): array => ['role' => $role]);
    }

    private function newUserId(): string
    {
        // Конкретный класс пользователя принадлежит приложению/identity;
        // пакет chat знает только framework-конфиг auth-провайдера (§4.1).
        $model = config('auth.providers.users.model');

        return (string) $model::factory()->create()->getKey();
    }
}
