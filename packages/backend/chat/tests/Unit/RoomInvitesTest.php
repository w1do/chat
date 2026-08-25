<?php

declare(strict_types=1);

use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Chat\Application\Commands\CreateInviteCommand;
use Vendor\Chat\Application\Commands\JoinByInviteCommand;
use Vendor\Chat\Application\Handlers\Commands\CreateInviteHandler;
use Vendor\Chat\Application\Handlers\Commands\JoinByInviteHandler;
use Vendor\Chat\Application\Handlers\Commands\RevokeInviteHandler;
use Vendor\Chat\Application\Handlers\Queries\GetInviteHandler;
use Vendor\Chat\Application\Queries\GetInviteQuery;
use Vendor\Chat\Domain\Enums\MessageKind;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomInvite;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Identity\Domain\Models\User;

/** Комната с одним участником: [room, member]. */
function roomWithHost(): array
{
    $room = Room::factory()->create(['name' => 'Семья']);
    $host = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $host->getKey(), 'role' => RoomRole::Owner]);

    return [$room, $host];
}

function inviteFor(Room $room, User $host): string
{
    return app(CreateInviteHandler::class)->handle(
        new CreateInviteCommand(roomId: $room->id, userId: (string) $host->getKey()),
    )->token ?? '';
}

it('creates an invite that stores only the token hash', function (): void {
    [$room, $host] = roomWithHost();

    $invite = app(CreateInviteHandler::class)->handle(
        new CreateInviteCommand(roomId: $room->id, userId: (string) $host->getKey()),
    );

    expect($invite->token)->not->toBeNull()
        ->and(mb_strlen((string) $invite->token))->toBeGreaterThan(30)
        ->and($invite->roomName)->toBe('Семья');

    $stored = RoomInvite::query()->sole();

    // Самого токена в базе нет — только его хэш.
    expect($stored->token_hash)->toBe(RoomInvite::hashToken((string) $invite->token))
        ->and($stored->getAttributes())->not->toHaveKey('token')
        ->and($stored->expires_at->isFuture())->toBeTrue();
});

it('refuses to invite into an archived room', function (): void {
    [$room, $host] = roomWithHost();
    $room->forceFill(['archived_at' => Carbon::now()])->save();

    expect(fn () => app(CreateInviteHandler::class)->handle(
        new CreateInviteCommand(roomId: $room->id, userId: (string) $host->getKey()),
    ))->toThrow(ConflictHttpException::class);
});

it('lets an invited person join and records it in the room history', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);
    $guest = User::factory()->create();

    $member = app(JoinByInviteHandler::class)->handle(
        new JoinByInviteCommand(token: $token, userId: (string) $guest->getKey()),
    );

    expect($member->role)->toBe(RoomRole::Member->value)
        ->and($room->members()->count())->toBe(2)
        ->and(Message::query()->where('kind', MessageKind::System)->count())->toBe(1)
        ->and(RoomInvite::query()->sole()->uses)->toBe(1);
});

it('is safe to follow the same link twice', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);
    $guest = User::factory()->create();

    app(JoinByInviteHandler::class)->handle(new JoinByInviteCommand($token, (string) $guest->getKey()));
    app(JoinByInviteHandler::class)->handle(new JoinByInviteCommand($token, (string) $guest->getKey()));

    expect($room->members()->where('user_id', $guest->getKey())->count())->toBe(1)
        ->and(Message::query()->where('kind', MessageKind::System)->count())->toBe(1);
});

it('serves several people from one link', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);

    foreach (range(1, 3) as $ignored) {
        app(JoinByInviteHandler::class)->handle(
            new JoinByInviteCommand($token, (string) User::factory()->create()->getKey()),
        );
    }

    expect($room->members()->count())->toBe(4)
        ->and(RoomInvite::query()->sole()->uses)->toBe(3);
});

it('stops working once revoked', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);

    app(RevokeInviteHandler::class)->handle(RoomInvite::query()->sole()->id);

    expect(fn () => app(JoinByInviteHandler::class)->handle(
        new JoinByInviteCommand($token, (string) User::factory()->create()->getKey()),
    ))->toThrow(NotFoundHttpException::class);
});

it('stops working once expired', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);

    RoomInvite::query()->sole()->forceFill(['expires_at' => Carbon::now()->subMinute()])->save();

    expect(fn () => app(JoinByInviteHandler::class)->handle(
        new JoinByInviteCommand($token, (string) User::factory()->create()->getKey()),
    ))->toThrow(NotFoundHttpException::class);
});

it('tells the visitor where they are invited, without extra detail', function (): void {
    [$room, $host] = roomWithHost();
    $token = inviteFor($room, $host);

    $invite = app(GetInviteHandler::class)->handle(new GetInviteQuery($token));

    expect($invite->roomName)->toBe('Семья')
        ->and($invite->invitedByName)->toBe($host->name)
        // Токен не возвращается: он есть только у того, кто открыл ссылку.
        ->and($invite->token)->toBeNull();
});

it('hides whether an unknown token ever existed', function (): void {
    expect(fn () => app(GetInviteHandler::class)->handle(new GetInviteQuery('never-existed')))
        ->toThrow(NotFoundHttpException::class);
});
