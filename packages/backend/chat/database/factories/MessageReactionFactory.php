<?php

declare(strict_types=1);

namespace Vendor\Chat\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;

/** @extends Factory<MessageReaction> */
class MessageReactionFactory extends Factory
{
    protected $model = MessageReaction::class;

    public function definition(): array
    {
        return [
            'message_id' => Message::factory(),
            'user_id' => fn () => $this->newUserId(),
            'emoji' => '👍',
        ];
    }

    private function newUserId(): string
    {
        $model = config('auth.providers.users.model');

        return (string) $model::factory()->create()->getKey();
    }
}
