<?php

declare(strict_types=1);

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Vendor\Chat\Application\Commands\RemoveMemberCommand;
use Vendor\Chat\Application\Handlers\Commands\RemoveMemberHandler;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Identity\Domain\Models\User;

it('takes the membership away and leaves what the person wrote', function (): void {
    $room = Room::factory()->privateRoom()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Owner)->create();
    $removed = User::factory()->create();
    $member = RoomMember::factory()->for($room)->create(['user_id' => $removed->getKey()]);

    $message = Message::factory()->for($room)->create(['author_id' => $removed->getKey()]);

    app(RemoveMemberHandler::class)->handle(new RemoveMemberCommand($room->id, $member->id));

    expect(RoomMember::query()->whereKey($member->id)->exists())->toBeFalse()
        ->and($room->fresh()->hasMember($removed))->toBeFalse()
        // Переписка комнаты не переписывается задним числом.
        ->and(Message::query()->whereKey($message->id)->exists())->toBeTrue();
});

it('refuses to leave the room without an owner', function (): void {
    $room = Room::factory()->create();
    $owner = RoomMember::factory()->for($room)->role(RoomRole::Owner)->create();

    expect(fn () => app(RemoveMemberHandler::class)->handle(new RemoveMemberCommand($room->id, $owner->id)))
        ->toThrow(ConflictHttpException::class);

    expect(RoomMember::query()->whereKey($owner->id)->exists())->toBeTrue();
});
