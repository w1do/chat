<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Application\Commands\HideDirectConversationCommand;
use Vendor\Chat\Domain\Models\RoomMember;

/**
 * Скрыть диалог у себя: отметка на собственной записи участия. Переписка и
 * собеседник не затрагиваются; новое сообщение снимает отметку и возвращает
 * диалог в список (design 4).
 */
final readonly class HideDirectConversationHandler
{
    public function handle(HideDirectConversationCommand $command): void
    {
        RoomMember::query()
            ->where('room_id', $command->roomId)
            ->where('user_id', $command->userId)
            ->update(['hidden_at' => now()]);
    }
}
