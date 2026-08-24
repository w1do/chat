<?php

declare(strict_types=1);

namespace Vendor\Chat\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

/** @extends Factory<Message> */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'author_id' => fn () => $this->newUserId(),
            'body' => fake()->sentence(),
            'mentions' => null,
        ];
    }

    private function newUserId(): string
    {
        $model = config('auth.providers.users.model');

        return (string) $model::factory()->create()->getKey();
    }
}
