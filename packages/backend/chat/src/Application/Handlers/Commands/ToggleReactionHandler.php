<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\ToggleReactionCommand;
use Vendor\Chat\Application\DTOs\ReactionData;
use Vendor\Chat\Domain\Events\ReactionChanged;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;

final readonly class ToggleReactionHandler
{
    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(ToggleReactionCommand $command): ReactionData
    {
        [$reacted, $roomId] = $this->db->connection()->transaction(function () use ($command): array {
            /** @var Message $message */
            $message = Message::query()->lockForUpdate()->findOrFail($command->messageId);

            $existing = MessageReaction::query()
                ->where('message_id', $command->messageId)
                ->where('user_id', $command->userId)
                ->where('emoji', $command->emoji)
                ->first();

            if ($existing !== null) {
                $existing->delete();

                return [false, $message->room_id];
            }

            MessageReaction::query()->create([
                'message_id' => $command->messageId,
                'user_id' => $command->userId,
                'emoji' => $command->emoji,
            ]);

            return [true, $message->room_id];
        });

        $this->events->dispatch(new ReactionChanged($roomId, $command->messageId));

        $count = MessageReaction::query()
            ->where('message_id', $command->messageId)
            ->where('emoji', $command->emoji)
            ->count();

        return new ReactionData(emoji: $command->emoji, count: $count, reactedByMe: $reacted);
    }
}
