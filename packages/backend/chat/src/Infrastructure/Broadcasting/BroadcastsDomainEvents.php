<?php

declare(strict_types=1);

namespace Vendor\Chat\Infrastructure\Broadcasting;

use Illuminate\Contracts\Events\Dispatcher;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Events\MessageDeleted;
use Vendor\Chat\Domain\Events\MessageUpdated;
use Vendor\Chat\Domain\Events\ReactionChanged;
use Vendor\Chat\Domain\Events\RoomMemberChanged;
use Vendor\Chat\Domain\Events\TypingChanged;
use Vendor\Chat\Domain\Models\Message;

/**
 * Мост Domain/Events → Infrastructure/Broadcasting: собирает урезанный
 * payload конверта из моделей и диспатчит версионированный broadcast.
 * Отправка — после commit (ShouldDispatchAfterCommit на broadcast-классах).
 */
final readonly class BroadcastsDomainEvents
{
    public function __construct(private Dispatcher $events) {}

    public function onMessageCreated(MessageCreated $event): void
    {
        $message = Message::query()->withTrashed()->find($event->messageId);
        if ($message === null) {
            return;
        }

        $userModel = config('auth.providers.users.model');
        $authorName = (string) $userModel::query()->whereKey($message->author_id)->value('name');

        $this->events->dispatch(new MessageCreatedV1($event->roomId, [
            'id' => $message->id,
            'author' => ['id' => $message->author_id, 'name' => $authorName],
            'body' => (string) $message->body,
            'reply_to_id' => $message->reply_to_id,
            'created_at' => (string) $message->created_at?->toIso8601ZuluString(),
        ], now()->toIso8601ZuluString()));
    }

    public function onMessageUpdated(MessageUpdated $event): void
    {
        $message = Message::query()->find($event->messageId);
        if ($message === null) {
            return;
        }

        $this->events->dispatch(new MessageUpdatedV1($event->roomId, [
            'id' => $message->id,
            'body' => (string) $message->body,
            'edited_at' => (string) $message->edited_at?->toIso8601ZuluString(),
        ], now()->toIso8601ZuluString()));
    }

    public function onMessageDeleted(MessageDeleted $event): void
    {
        $message = Message::query()->withTrashed()->find($event->messageId);
        if ($message === null) {
            return;
        }

        $this->events->dispatch(new MessageDeletedV1($event->roomId, [
            'id' => $message->id,
            'deleted_at' => (string) $message->deleted_at?->toIso8601ZuluString(),
        ], now()->toIso8601ZuluString()));
    }

    public function onReactionChanged(ReactionChanged $event): void
    {
        $this->events->dispatch(new ReactionChangedV1($event->roomId, [
            'message_id' => $event->messageId,
            'user_id' => $event->userId,
            'emoji' => $event->emoji,
            'action' => $event->action,
            'count' => $event->count,
        ], now()->toIso8601ZuluString()));
    }

    public function onRoomMemberChanged(RoomMemberChanged $event): void
    {
        $this->events->dispatch(new RoomMemberChangedV1($event->roomId, [
            'user_id' => $event->userId,
            'action' => $event->action,
            'role' => $event->role,
        ], now()->toIso8601ZuluString()));
    }

    public function onTypingChanged(TypingChanged $event): void
    {
        $this->events->dispatch(new TypingChangedV1($event->roomId, [
            'user_id' => $event->userId,
            'is_typing' => $event->isTyping,
        ], now()->toIso8601ZuluString()));
    }
}
