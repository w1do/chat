<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Event;
use Vendor\Chat\Application\Commands\DeleteRoomCommand;
use Vendor\Chat\Application\Handlers\Commands\DeleteRoomHandler;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Events\RoomDeleted;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Identity\Domain\Models\User;

it('removes the room with everything attached to it', function (): void {
    $room = Room::factory()->privateRoom()->create(['name' => 'Family']);
    $owner = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create(['user_id' => $owner->getKey()]);

    $message = Message::factory()->for($room)->create(['author_id' => $owner->getKey()]);
    $trashed = Message::factory()->for($room)->create(['author_id' => $owner->getKey()]);
    $trashed->delete();

    MessageReaction::factory()->create(['message_id' => $message->id, 'user_id' => $owner->getKey()]);
    RoomInvite::query()->create([
        'room_id' => $room->id,
        'created_by' => $owner->getKey(),
        'token_hash' => hash('sha256', 'token'),
        'expires_at' => now()->addDay(),
    ]);

    // Комната с сообщениями другой комнаты не путается: соседка должна уцелеть.
    $neighbour = Room::factory()->create();
    $neighbourMessage = Message::factory()->for($neighbour)->create(['author_id' => $owner->getKey()]);

    app(DeleteRoomHandler::class)->handle(new DeleteRoomCommand($room->id, (string) $owner->getKey()));

    expect(Room::query()->whereKey($room->id)->exists())->toBeFalse()
        ->and(Message::query()->withTrashed()->where('room_id', $room->id)->exists())->toBeFalse()
        ->and(MessageReaction::query()->where('message_id', $message->id)->exists())->toBeFalse()
        ->and(RoomInvite::query()->where('room_id', $room->id)->exists())->toBeFalse()
        ->and(RoomMember::query()->where('room_id', $room->id)->exists())->toBeFalse()
        ->and(Message::query()->whereKey($neighbourMessage->id)->exists())->toBeTrue();
});

it('announces the deletion once and stays quiet on a repeat', function (): void {
    Event::fake([RoomDeleted::class]);

    $room = Room::factory()->create(['name' => 'Family']);
    $owner = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create(['user_id' => $owner->getKey()]);
    Message::factory()->for($room)->create(['author_id' => $owner->getKey()]);

    $handler = app(DeleteRoomHandler::class);
    $command = new DeleteRoomCommand($room->id, (string) $owner->getKey());

    $handler->handle($command);
    $handler->handle($command); // повтор безвреден

    Event::assertDispatchedTimes(RoomDeleted::class, 1);
    Event::assertDispatched(RoomDeleted::class, fn (RoomDeleted $event): bool => $event->roomId === $room->id
        && $event->roomName === 'Family'
        && count($event->messageIds) === 1);
});
