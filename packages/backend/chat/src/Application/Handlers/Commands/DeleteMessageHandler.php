<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\DeleteMessageCommand;
use Vendor\Chat\Domain\Events\MessageDeleted;
use Vendor\Chat\Domain\Models\Message;

final readonly class DeleteMessageHandler
{
    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(DeleteMessageCommand $command): void
    {
        $message = $this->db->connection()->transaction(function () use ($command): Message {
            /** @var Message $message */
            $message = Message::query()->lockForUpdate()->findOrFail($command->messageId);

            // Мягкое удаление: строка и связи ответов сохраняются.
            $message->delete();

            return $message;
        });

        $this->events->dispatch(new MessageDeleted($message->room_id, $message->id));
    }
}
