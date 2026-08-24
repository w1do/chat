<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionResolverInterface;
use Vendor\Chat\Application\Commands\LeaveRoomCommand;
use Vendor\Chat\Domain\Enums\SystemEvent;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class LeaveRoomHandler
{
    use RecordsSystemMessage;

    public function __construct(
        private Dispatcher $events,
        private ConnectionResolverInterface $db,
    ) {}

    public function handle(LeaveRoomCommand $command): void
    {
        $systemMessageId = $this->db->connection()->transaction(function () use ($command): ?string {
            $deleted = RoomMember::query()
                ->where('room_id', $command->roomId)
                ->where('user_id', $command->userId)
                ->delete();

            if ($deleted === 0) {
                return null;
            }

            return $this->recordSystemMessage($command->roomId, $command->userId, SystemEvent::MemberLeft)->id;
        });

        if ($systemMessageId !== null) {
            $this->events->dispatch(new RoomMemberChanged($command->roomId, $command->userId, 'left', null));
            $this->events->dispatch(new MessageCreated($command->roomId, $systemMessageId));
        }
    }
}
