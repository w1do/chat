<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\EditMessageCommand;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Domain\Contracts\MessageSanitizer;
use Vendor\Chat\Domain\Events\MessageUpdated;
use Vendor\Chat\Domain\Models\Message;

final readonly class EditMessageHandler
{
    public function __construct(
        private ConnectionResolverInterface $db,
        private MessageSanitizer $sanitizer,
        private Dispatcher $events,
    ) {}

    public function handle(EditMessageCommand $command): MessageData
    {
        $body = $this->sanitizer->sanitize($command->body);

        // Row lock: параллельные правки не теряют edited_at/body.
        $message = $this->db->connection()->transaction(function () use ($command, $body): Message {
            /** @var Message $message */
            $message = Message::query()->lockForUpdate()->findOrFail($command->messageId);

            $message->forceFill([
                'body' => $body->value,
                'edited_at' => now(),
            ])->save();

            return $message;
        });

        $this->events->dispatch(new MessageUpdated($message->room_id, $message->id));

        return MessageData::fromModel($message);
    }
}
