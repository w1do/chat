<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\Commands;

use Vendor\Notifications\Domain\Enums\Category;

/** Событие комнаты, о котором стоит сообщить тем, кого нет в комнате. */
final readonly class NotifyRoomEventCommand
{
    /** @param list<string> $recipientIds */
    public function __construct(
        public Category $category,
        public string $roomId,
        /** null — личная переписка: у диалога нет названия, уведомление называет отправителя. */
        public ?string $roomName,
        public string $actorId,
        public string $actorName,
        public array $recipientIds,
        public string $preview = '',
        public ?string $messageId = null,
    ) {}
}
