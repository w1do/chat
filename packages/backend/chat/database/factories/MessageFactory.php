<?php

declare(strict_types=1);

namespace Vendor\Chat\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Enums\SystemEvent;
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
            'kind' => MessageKind::Text,
            'body' => fake()->sentence(),
            'mentions' => null,
            'payload' => null,
        ];
    }

    public function system(SystemEvent $event = SystemEvent::MemberJoined, ?string $actorId = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'kind' => MessageKind::System,
            'body' => '',
            'payload' => [
                'event' => $event->value,
                'actor_id' => $actorId ?? $attributes['author_id'],
            ],
        ]);
    }

    private function newUserId(): string
    {
        $model = config('auth.providers.users.model');

        return (string) $model::factory()->create()->getKey();
    }
}
