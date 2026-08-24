<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\MarkRoomReadCommand;
use Vendor\Chat\Domain\Models\RoomMember;

final readonly class MarkRoomReadHandler
{
    public function handle(MarkRoomReadCommand $command): void
    {
        // Монотонность: отметка не движется назад при гонке параллельных запросов.
        RoomMember::query()
            ->where('room_id', $command->roomId)
            ->where('user_id', $command->userId)
            ->where(function ($query) use ($command): void {
                $query->whereNull('last_read_message_id')
                    ->orWhere('last_read_message_id', '<', $command->lastReadMessageId);
            })
            ->update(['last_read_message_id' => $command->lastReadMessageId]);
    }
}
