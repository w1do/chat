<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\DeleteRoomCommand;
use Vendor\Chat\Domain\Events\RoomDeleted;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;

/**
 * Удаление комнаты навсегда. Что именно исчезает — видно здесь, а не только в
 * каскадах базы: реакции, сообщения, приглашения, участие и сама комната.
 * Повторный вызов безвреден: удалять уже нечего.
 */
final readonly class DeleteRoomHandler
{
    /** Реакции удаляются пакетами: у большой комнаты идентификаторов много. */
    private const CHUNK = 500;

    public function __construct(
        private ConnectionResolverInterface $db,
        private Dispatcher $events,
    ) {}

    public function handle(DeleteRoomCommand $command): void
    {
        /** @var ?Room $room */
        $room = Room::query()->find($command->roomId);

        if ($room === null) {
            return;
        }

        /** @var list<string> $messageIds */
        $messageIds = Message::query()
            ->withTrashed()
            ->where('room_id', $room->id)
            ->pluck('id')
            ->all();

        $this->db->connection()->transaction(function () use ($room, $messageIds): void {
            foreach (array_chunk($messageIds, self::CHUNK) as $chunk) {
                MessageReaction::query()->whereIn('message_id', $chunk)->delete();
            }

            Message::query()->withTrashed()->where('room_id', $room->id)->forceDelete();
            RoomInvite::query()->where('room_id', $room->id)->delete();
            RoomMember::query()->where('room_id', $room->id)->delete();

            $room->delete();
        });

        $this->events->dispatch(new RoomDeleted($room->id, $room->name, $command->actorId, $messageIds));
    }
}
