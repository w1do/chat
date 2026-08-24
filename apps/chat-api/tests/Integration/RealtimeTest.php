<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Support\FakePresenceRegistry;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Commands\SetTypingCommand;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\SetTypingHandler;
use Vendor\Chat\Domain\Contracts\PresenceRegistry;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Infrastructure\Broadcasting\MessageCreatedV1;
use Vendor\Chat\Infrastructure\Broadcasting\TypingChangedV1;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    // По умолчанию тесты используют null-broadcaster (без сети). Авторизация
    // каналов проверяется на реальном pusher-совместимом драйвере Reverb:
    // переключаем драйвер и перерегистрируем каналы на нём.
    config()->set('broadcasting.default', 'reverb');
    require base_path('routes/channels.php');
});

function chatMember(Room $room): User
{
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $user->getKey()]);

    return $user;
}

it('authorizes room channels for members only', function (): void {
    $room = Room::factory()->privateRoom()->create();
    $member = chatMember($room);
    $outsider = User::factory()->create();

    $this->actingAs($member)->postJson('/broadcasting/auth', [
        'channel_name' => "private-room.{$room->id}",
        'socket_id' => '123.456',
    ])->assertOk();

    $this->actingAs($outsider)->postJson('/broadcasting/auth', [
        'channel_name' => "private-room.{$room->id}",
        'socket_id' => '123.456',
    ])->assertStatus(403);
});

it('authorizes presence channels with member payload and rejects outsiders', function (): void {
    $room = Room::factory()->create();
    $member = chatMember($room);
    $outsider = User::factory()->create();

    $this->actingAs($member)->postJson('/broadcasting/auth', [
        'channel_name' => "presence-room.{$room->id}.presence",
        'socket_id' => '123.456',
    ])->assertOk()->assertJsonStructure(['auth', 'channel_data']);

    $this->actingAs($outsider)->postJson('/broadcasting/auth', [
        'channel_name' => "presence-room.{$room->id}.presence",
        'socket_id' => '123.456',
    ])->assertStatus(403);
});

it('authorizes the user channel only for its owner', function (): void {
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $this->actingAs($alice)->postJson('/broadcasting/auth', [
        'channel_name' => "private-user.{$alice->externalId()}",
        'socket_id' => '123.456',
    ])->assertOk();

    $this->actingAs($bob)->postJson('/broadcasting/auth', [
        'channel_name' => "private-user.{$alice->externalId()}",
        'socket_id' => '123.456',
    ])->assertStatus(403);
});

it('broadcasts message.created.v1 after commit with envelope payload', function (): void {
    Event::fake([MessageCreatedV1::class]);

    $room = Room::factory()->create();
    $author = chatMember($room);

    app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: 'Realtime hello',
    ));

    Event::assertDispatched(MessageCreatedV1::class, function (MessageCreatedV1 $event) use ($room): bool {
        $payload = $event->broadcastWith();

        return $event->broadcastAs() === 'message.created.v1'
            && $payload['room_id'] === $room->id
            && $payload['data']['body'] === 'Realtime hello'
            && $event->broadcastOn()[0]->name === "private-room.{$room->id}";
    });
});

it('does not broadcast when the surrounding transaction rolls back', function (): void {
    Event::fake([MessageCreatedV1::class]);

    $room = Room::factory()->create();
    $author = chatMember($room);

    try {
        DB::transaction(function () use ($room, $author): void {
            app(SendMessageHandler::class)->handle(new SendMessageCommand(
                roomId: $room->id,
                authorId: (string) $author->getKey(),
                body: 'Must never leave the transaction',
            ));

            throw new RuntimeException('force rollback');
        });
    } catch (RuntimeException) {
        // ожидаемо
    }

    Event::assertNotDispatched(MessageCreatedV1::class);
    expect(Message::query()->count())->toBe(0);
});

it('broadcasts typing over the presence channel', function (): void {
    Event::fake([TypingChangedV1::class]);
    app()->bind(
        PresenceRegistry::class,
        FakePresenceRegistry::class,
    );

    $room = Room::factory()->create();
    $member = chatMember($room);

    app(SetTypingHandler::class)->handle(new SetTypingCommand($room->id, (string) $member->getKey(), true));

    Event::assertDispatched(TypingChangedV1::class, function (TypingChangedV1 $event) use ($room, $member): bool {
        $payload = $event->broadcastWith();

        return $event->broadcastOn()[0]->name === "presence-room.{$room->id}.presence"
            && $payload['data']['user_id'] === (string) $member->getKey()
            && $payload['data']['is_typing'] === true;
    });
});

it('sets typing through the API endpoint for members only', function (): void {
    Event::fake([TypingChangedV1::class]);
    app()->bind(
        PresenceRegistry::class,
        FakePresenceRegistry::class,
    );

    $room = Room::factory()->create();
    $member = chatMember($room);
    $outsider = User::factory()->create();

    $this->actingAs($member)->postJson("/api/v1/rooms/{$room->id}/typing", ['is_typing' => true])
        ->assertNoContent();
    $this->actingAs($outsider)->postJson("/api/v1/rooms/{$room->id}/typing", ['is_typing' => true])
        ->assertStatus(403);
});
