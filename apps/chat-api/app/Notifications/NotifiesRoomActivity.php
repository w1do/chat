<?php

declare(strict_types=1);

namespace App\Notifications;

use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Notifications\Application\Commands\NotifyRoomEventCommand;
use Vendor\Notifications\Application\Handlers\Commands\NotifyRoomEventHandler;
use Vendor\Notifications\Domain\Enums\Category;

/**
 * Связка chat → notifications. Живёт в приложении, потому что знает оба
 * пакета сразу; сами пакеты остаются независимыми (§4.1).
 */
final readonly class NotifiesRoomActivity
{
    public function __construct(private NotifyRoomEventHandler $notifier) {}

    public function onMessageCreated(MessageCreated $event): void
    {
        $message = Message::query()->find($event->messageId);

        if ($message === null || $message->isSystem()) {
            // Системные записи («присоединился») не поднимают уведомления.
            return;
        }

        $room = Room::query()->find($message->room_id);

        if ($room === null) {
            return;
        }

        $memberIds = RoomMember::query()
            ->where('room_id', $room->id)
            ->pluck('user_id')
            ->map(fn ($id): string => (string) $id)
            ->all();

        $authorName = $this->displayName($message->author_id);
        $mentions = array_values(array_intersect($message->mentions ?? [], $memberIds));

        // Упоминание — отдельная, более заметная категория.
        if ($mentions !== []) {
            $this->notifier->handle(new NotifyRoomEventCommand(
                category: Category::Mention,
                roomId: $room->id,
                roomName: $room->name,
                actorId: $message->author_id,
                actorName: $authorName,
                recipientIds: $mentions,
                preview: $this->preview($message->body),
                messageId: $message->id,
            ));
        }

        $others = array_values(array_diff($memberIds, $mentions));

        if ($others !== []) {
            $this->notifier->handle(new NotifyRoomEventCommand(
                category: Category::Message,
                roomId: $room->id,
                roomName: $room->name,
                actorId: $message->author_id,
                actorName: $authorName,
                recipientIds: $others,
                preview: $this->preview($message->body),
                messageId: $message->id,
            ));
        }
    }

    public function onRoomMemberChanged(RoomMemberChanged $event): void
    {
        if ($event->action !== 'invited') {
            return;
        }

        $room = Room::query()->find($event->roomId);

        if ($room === null) {
            return;
        }

        $this->notifier->handle(new NotifyRoomEventCommand(
            category: Category::RoomInvite,
            roomId: $room->id,
            roomName: $room->name,
            // Приглашение показываем самому приглашённому: инициатор здесь не он.
            actorId: '',
            actorName: $this->displayName($event->userId),
            recipientIds: [$event->userId],
            preview: "Вас добавили в комнату «{$room->name}»",
        ));
    }

    private function displayName(string $userId): string
    {
        $model = config('auth.providers.users.model');

        return (string) ($model::query()->whereKey($userId)->value('name') ?? 'Участник');
    }

    private function preview(?string $body): string
    {
        return mb_substr((string) $body, 0, 140);
    }
}
