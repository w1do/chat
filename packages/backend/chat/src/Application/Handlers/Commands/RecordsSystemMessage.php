<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Handlers\Commands;

use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Enums\SystemEvent;
use Vendor\Chat\Domain\Models\Message;

/**
 * Системная запись в ленте комнаты (design 1c): текст формулирует клиент,
 * поэтому в базе лежит только событие и его участник.
 */
trait RecordsSystemMessage
{
    private function recordSystemMessage(string $roomId, string $actorId, SystemEvent $event): Message
    {
        return Message::query()->create([
            'room_id' => $roomId,
            'kind' => MessageKind::System,
            'author_id' => $actorId,
            'body' => '',
            'payload' => ['event' => $event->value, 'actor_id' => $actorId],
        ]);
    }
}
