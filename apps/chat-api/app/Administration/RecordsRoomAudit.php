<?php

declare(strict_types=1);

namespace App\Administration;

use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Chat\Domain\Events\RoomDeleted;

/**
 * Удаление комнаты необратимо, поэтому попадает в журнал аудита. В контекст
 * идут только метаданные: название и объём, но не переписка (CLAUDE.md §11).
 */
final readonly class RecordsRoomAudit
{
    public function __construct(private AuditRecorder $audit) {}

    public function onRoomDeleted(RoomDeleted $event): void
    {
        $this->audit->record(
            action: 'chat.room.deleted',
            actorId: $event->actorId,
            subjectType: 'room',
            subjectId: $event->roomId,
            context: [
                'name' => $event->roomName,
                'message_count' => count($event->messageIds),
            ],
        );
    }
}
