<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Vendor\Chat\Application\Commands\CreateRoomCommand;
use Vendor\Chat\Application\Commands\HideDirectConversationCommand;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Commands\StartDirectConversationCommand;
use Vendor\Chat\Application\DTOs\RoomData;
use Vendor\Chat\Application\Handlers\Commands\CreateRoomHandler;
use Vendor\Chat\Application\Handlers\Commands\HideDirectConversationHandler;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\StartDirectConversationHandler;
use Vendor\Chat\Application\Handlers\Queries\ListRoomsHandler;
use Vendor\Chat\Application\Queries\ListRoomsQuery;
use Vendor\Chat\Domain\Enums\RoomKind;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MembershipPolicy;
use Vendor\Chat\Domain\Policies\RoomPolicy;
use Vendor\Chat\Domain\ValueObjects\DirectPair;
use Vendor\Identity\Domain\Models\User;

function startConversation(User $initiator, User $counterpart): RoomData
{
    return app(StartDirectConversationHandler::class)->handle(new StartDirectConversationCommand(
        initiatorId: (string) $initiator->getKey(),
        counterpartId: (string) $counterpart->getKey(),
    ))['room'];
}

function conversationRoom(RoomData $data): Room
{
    return Room::query()->findOrFail($data->id);
}

function sendDirectMessage(Room $room, User $author, string $body): void
{
    app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: $body,
    ));
}

function listedRoomIds(User $user): array
{
    return collect(app(ListRoomsHandler::class)->handle(new ListRoomsQuery, $user))
        ->pluck('id')
        ->all();
}

// --- Вид переписки (1.1) ---

it('creates ordinary rooms with the room kind', function (): void {
    $creator = User::factory()->create();

    $data = app(CreateRoomHandler::class)->handle(new CreateRoomCommand(
        userId: (string) $creator->getKey(),
        name: 'Гостиная',
        topic: null,
        visibility: 'public',
    ));

    $room = Room::query()->findOrFail($data->id);

    expect($room->kind)->toBe(RoomKind::Room)
        ->and($room->isDirect())->toBeFalse()
        ->and($data->kind)->toBe('room')
        ->and($room->direct_key)->toBeNull();
});

// --- Ключ пары и его уникальность (1.3) ---

it('orders the pair key the same way regardless of who starts', function (): void {
    expect(DirectPair::of('b', 'a')->key())->toBe(DirectPair::of('a', 'b')->key())
        ->and(DirectPair::counterpartOf('a:b', 'a'))->toBe('b')
        ->and(DirectPair::counterpartOf('a:b', 'b'))->toBe('a')
        ->and(DirectPair::counterpartOf('a:b', 'c'))->toBeNull();
});

it('refuses a second conversation of the same pair at the database level', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();

    Room::factory()->directBetween((string) $anna->getKey(), (string) $boris->getKey())->create();

    // Порядок участников не важен: ключ пары упорядочен одинаково.
    expect(fn () => Room::factory()
        ->directBetween((string) $boris->getKey(), (string) $anna->getKey())
        ->create())->toThrow(QueryException::class);
});

it('lets different pairs coexist while rooms stay out of the index', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $vera = User::factory()->create();

    Room::factory()->directBetween((string) $anna->getKey(), (string) $boris->getKey())->create();
    Room::factory()->directBetween((string) $anna->getKey(), (string) $vera->getKey())->create();
    Room::factory()->count(2)->create();

    expect(Room::query()->where('kind', 'direct')->count())->toBe(2);
});

// --- Начало диалога (2.1) ---

it('starts a conversation with both people as plain members and no owner', function (): void {
    $anna = User::factory()->create(['username' => 'anna', 'name' => 'Анна']);
    $boris = User::factory()->create(['username' => 'boris', 'name' => 'Борис']);

    $data = startConversation($anna, $boris);
    $room = conversationRoom($data);

    expect($room->kind)->toBe(RoomKind::Direct)
        ->and($room->visibility->value)->toBe('private')
        ->and($room->members()->count())->toBe(2)
        ->and($room->members()->where('role', RoomRole::Owner->value)->exists())->toBeFalse()
        ->and($room->roleOf($anna))->toBe(RoomRole::Member)
        ->and($room->roleOf($boris))->toBe(RoomRole::Member)
        // Подпись диалога — собеседник, а не название.
        ->and($data->name)->toBeNull()
        ->and($data->kind)->toBe('direct')
        ->and($data->counterpart?->id)->toBe((string) $boris->getKey())
        ->and($data->counterpart?->username)->toBe('boris')
        ->and($data->counterpart?->name)->toBe('Борис');
});

it('refuses a conversation with yourself', function (): void {
    $anna = User::factory()->create();

    expect(fn () => startConversation($anna, $anna))->toThrow(ValidationException::class);
});

it('refuses a conversation with a person who does not exist', function (): void {
    $anna = User::factory()->create();

    expect(fn () => app(StartDirectConversationHandler::class)->handle(new StartDirectConversationCommand(
        initiatorId: (string) $anna->getKey(),
        counterpartId: '01K00000000000000000000000',
    )))->toThrow(ValidationException::class);
});

// --- Повтор и встречное начало (2.2) ---

it('returns the same conversation on a repeated start from either side', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();

    $first = startConversation($anna, $boris);
    $again = startConversation($anna, $boris);
    $reverse = startConversation($boris, $anna);

    expect($again->id)->toBe($first->id)
        ->and($reverse->id)->toBe($first->id)
        ->and(Room::query()->where('kind', 'direct')->count())->toBe(1);
});

it('reports whether the conversation was created or reopened', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();

    $handler = app(StartDirectConversationHandler::class);
    $command = new StartDirectConversationCommand((string) $anna->getKey(), (string) $boris->getKey());

    expect($handler->handle($command)['created'])->toBeTrue()
        ->and($handler->handle($command)['created'])->toBeFalse();
});

// --- Диалог — не комната: политики (3.1, 3.2) ---

it('denies every room action inside a conversation for both participants', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $room = conversationRoom(startConversation($anna, $boris));
    $target = $room->memberFor($boris);

    $roomPolicy = new RoomPolicy;
    $membershipPolicy = new MembershipPolicy;

    foreach ([$anna, $boris] as $participant) {
        expect($roomPolicy->view($participant, $room)->allowed())->toBeTrue()
            ->and($roomPolicy->update($participant, $room))->toBeFalse()
            ->and($roomPolicy->archive($participant, $room))->toBeFalse()
            ->and($roomPolicy->delete($participant, $room)->allowed())->toBeFalse()
            ->and($roomPolicy->changePhoto($participant, $room)->allowed())->toBeFalse()
            ->and($membershipPolicy->invite($participant, $room))->toBeFalse()
            ->and($membershipPolicy->changeRole($participant, $room, $target))->toBeFalse()
            ->and($membershipPolicy->remove($participant, $room, $target)->allowed())->toBeFalse()
            ->and($membershipPolicy->join($participant, $room))->toBeFalse()
            // Выход из диалога закрыт: уходить некуда, есть скрытие (3.2).
            ->and($membershipPolicy->leave($participant, $room))->toBeFalse();
    }

    // Участнику отвечают отказом, а не «не найдено».
    expect($roomPolicy->delete($anna, $room)->status())->toBeNull();
});

it('hides a foreign conversation entirely from an outsider', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $outsider = User::factory()->create();
    $room = conversationRoom(startConversation($anna, $boris));

    $roomPolicy = new RoomPolicy;
    $membershipPolicy = new MembershipPolicy;

    expect($roomPolicy->view($outsider, $room)->allowed())->toBeFalse()
        ->and($roomPolicy->view($outsider, $room)->status())->toBe(404)
        ->and($roomPolicy->delete($outsider, $room)->status())->toBe(404)
        ->and($membershipPolicy->hide($outsider, $room)->status())->toBe(404)
        ->and($membershipPolicy->join($outsider, $room))->toBeFalse();
});

it('allows hiding only a conversation, not a room', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $conversation = conversationRoom(startConversation($anna, $boris));

    $room = Room::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $anna->getKey()]);

    $policy = new MembershipPolicy;

    expect($policy->hide($anna, $conversation)->allowed())->toBeTrue()
        ->and($policy->hide($anna, $room->fresh())->allowed())->toBeFalse()
        ->and($policy->hide($anna, $room->fresh())->status())->toBeNull();
});

// --- Скрытие и возвращение (4.3) ---

it('shows an empty conversation to the initiator only until the first message', function (): void {
    $anna = User::factory()->create(['name' => 'Анна']);
    $boris = User::factory()->create(['name' => 'Борис']);

    $room = conversationRoom(startConversation($anna, $boris));

    expect(listedRoomIds($anna))->toContain($room->id)
        ->and(listedRoomIds($boris))->not->toContain($room->id);

    sendDirectMessage($room, $anna, 'Привет!');

    expect(listedRoomIds($boris))->toContain($room->id);
});

it('hides the conversation only for the one who hid it and brings it back with a new message', function (): void {
    $anna = User::factory()->create(['name' => 'Анна']);
    $boris = User::factory()->create(['name' => 'Борис']);

    $room = conversationRoom(startConversation($anna, $boris));
    sendDirectMessage($room, $anna, 'Привет!');

    app(HideDirectConversationHandler::class)->handle(new HideDirectConversationCommand(
        roomId: $room->id,
        userId: (string) $boris->getKey(),
    ));

    // Скрытие видно только скрывшему; история цела.
    expect(listedRoomIds($boris))->not->toContain($room->id)
        ->and(listedRoomIds($anna))->toContain($room->id)
        ->and($room->members()->count())->toBe(2);

    sendDirectMessage($room, $anna, 'Ты тут?');

    expect(listedRoomIds($boris))->toContain($room->id);
});

it('reopens a hidden conversation when its owner starts it again', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();

    $room = conversationRoom(startConversation($anna, $boris));
    sendDirectMessage($room, $anna, 'Привет!');

    app(HideDirectConversationHandler::class)->handle(new HideDirectConversationCommand(
        roomId: $room->id,
        userId: (string) $anna->getKey(),
    ));
    expect(listedRoomIds($anna))->not->toContain($room->id);

    $reopened = startConversation($anna, $boris);

    expect($reopened->id)->toBe($room->id)
        ->and(listedRoomIds($anna))->toContain($room->id);
});

// --- Список: подписи, порядок, один запрос на имена (4.2) ---

it('labels conversations by the counterpart and sorts the mixed list by label', function (): void {
    $me = User::factory()->create(['name' => 'Я']);
    $anna = User::factory()->create(['username' => 'anna', 'name' => 'Анна']);
    $vera = User::factory()->create(['username' => 'vera', 'name' => 'Вера']);

    $room = Room::factory()->create(['name' => 'Беседка']);
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $me->getKey()]);

    startConversation($me, $anna);
    startConversation($me, $vera);

    $list = app(ListRoomsHandler::class)->handle(new ListRoomsQuery, $me);

    $labels = collect($list)
        ->map(fn (RoomData $data): string => $data->counterpart?->name ?? (string) $data->name)
        ->all();

    // Анна — Беседка — Вера: одно правило порядка на комнаты и диалоги.
    expect($labels)->toBe(['Анна', 'Беседка', 'Вера'])
        ->and(collect($list)->firstWhere('kind', 'direct')?->counterpart?->username)->toBe('anna');
});

it('resolves counterpart names with a constant number of queries', function (): void {
    $me = User::factory()->create();

    foreach (range(1, 5) as $index) {
        $friend = User::factory()->create(['username' => 'friend'.$index, 'name' => 'Друг '.$index]);
        startConversation($me, $friend);
    }

    $room = Room::factory()->create(['name' => 'Общая']);
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $me->getKey()]);

    $handler = app(ListRoomsHandler::class);
    $queries = 0;
    DB::listen(function () use (&$queries): void {
        $queries++;
    });

    $handler->handle(new ListRoomsQuery, $me);
    $withFive = $queries;

    foreach (range(6, 10) as $index) {
        $friend = User::factory()->create(['username' => 'friend'.$index, 'name' => 'Друг '.$index]);
        startConversation($me, $friend);
    }

    $queries = 0;
    $handler->handle(new ListRoomsQuery, $me);

    // Диалогов вдвое больше — запросов столько же: имена берутся одним махом.
    expect($queries)->toBe($withFive);
});
