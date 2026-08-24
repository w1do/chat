<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Vendor\Chat\Application\Commands\MarkRoomReadCommand;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Commands\ToggleReactionCommand;
use Vendor\Chat\Application\DTOs\MessageData;
use Vendor\Chat\Application\Handlers\Commands\MarkRoomReadHandler;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\ToggleReactionHandler;
use Vendor\Chat\Application\Handlers\Queries\GetUnreadCountersHandler;
use Vendor\Chat\Application\Handlers\Queries\ListMessagesHandler;
use Vendor\Chat\Application\Queries\GetUnreadCountersQuery;
use Vendor\Chat\Application\Queries\ListMessagesQuery;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\MessageReaction;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\Policies\MessagePolicy;
use Vendor\Chat\Domain\ValueObjects\MessageBody;
use Vendor\Chat\Domain\ValueObjects\MessageCursor;
use Vendor\Identity\Domain\Models\User;

it('sends a message through the handler with sanitized body storage', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();

    $result = app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: "  Hello\x00\x08 <b>world</b>\n",
    ));

    // Управляющие символы удалены, текст триммлен, HTML хранится как текст.
    expect($result['message']->body)->toBe('Hello <b>world</b>')
        ->and($result['replayed'])->toBeFalse();
});

it('rejects empty and oversized bodies', function (): void {
    expect(fn () => MessageBody::fromUserInput("  \x00 "))->toThrow(InvalidArgumentException::class)
        ->and(fn () => MessageBody::fromUserInput(str_repeat('a', 4001)))->toThrow(InvalidArgumentException::class);
});

it('enforces the edit window policy', function (): void {
    $room = Room::factory()->create();
    $author = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $author->getKey()]);
    $message = Message::factory()->for($room)->create(['author_id' => $author->getKey()]);

    $policy = new MessagePolicy;

    expect($policy->update($author, $message))->toBeTrue();

    $message->forceFill(['created_at' => now()->subMinutes(16)])->save();
    expect($policy->update($author, $message->fresh()))->toBeFalse();

    $stranger = User::factory()->create();
    expect($policy->update($stranger, $message->fresh()))->toBeFalse();
});

it('soft deletes a message while preserving replies', function (): void {
    $room = Room::factory()->create();
    $parent = Message::factory()->for($room)->create();
    $reply = Message::factory()->for($room)->create(['reply_to_id' => $parent->id]);

    $parent->delete();

    expect(Message::withTrashed()->find($parent->id)->trashed())->toBeTrue()
        ->and($reply->fresh()->reply_to_id)->toBe($parent->id)
        ->and(Message::query()->find($reply->id))->not->toBeNull();
});

it('keeps reactions unique per message, user and emoji', function (): void {
    $reaction = MessageReaction::factory()->create();

    MessageReaction::query()->create([
        'message_id' => $reaction->message_id,
        'user_id' => $reaction->user_id,
        'emoji' => $reaction->emoji,
    ]);
})->throws(QueryException::class);

it('toggles reactions on and off through the handler', function (): void {
    $message = Message::factory()->create();
    $user = User::factory()->create();
    $handler = app(ToggleReactionHandler::class);

    $on = $handler->handle(new ToggleReactionCommand($message->id, (string) $user->getKey(), '🔥'));
    expect($on->reactedByMe)->toBeTrue()->and($on->count)->toBe(1);

    $off = $handler->handle(new ToggleReactionCommand($message->id, (string) $user->getKey(), '🔥'));
    expect($off->reactedByMe)->toBeFalse()->and($off->count)->toBe(0);
});

it('paginates history with a stable cursor and no duplicates', function (): void {
    $room = Room::factory()->create();
    $viewer = User::factory()->create();
    Message::factory()->for($room)->count(7)->create();

    $handler = app(ListMessagesHandler::class);

    $page1 = $handler->handle(new ListMessagesQuery($room->id, cursor: null, limit: 3), (string) $viewer->getKey());
    expect($page1->items)->toHaveCount(3)->and($page1->nextCursor)->not->toBeNull();

    // Новое сообщение в голове не сдвигает следующую страницу.
    Message::factory()->for($room)->create();

    $page2 = $handler->handle(new ListMessagesQuery($room->id, cursor: $page1->nextCursor, limit: 3), (string) $viewer->getKey());
    $page3 = $handler->handle(new ListMessagesQuery($room->id, cursor: $page2->nextCursor, limit: 3), (string) $viewer->getKey());

    $ids = array_merge(
        array_map(fn ($m) => $m->id, $page1->items),
        array_map(fn ($m) => $m->id, $page2->items),
        array_map(fn ($m) => $m->id, $page3->items),
    );

    expect($ids)->toHaveCount(count(array_unique($ids)))
        ->and($page3->nextCursor)->toBeNull();

    // Порядок строго убывающий (новые → старые).
    $sorted = $ids;
    rsort($sorted);
    expect($ids)->toBe($sorted);
});

it('rejects malformed cursors', function (): void {
    MessageCursor::fromString('not-a-cursor');
})->throws(InvalidArgumentException::class);

it('hides deleted bodies in DTOs', function (): void {
    $message = Message::factory()->create(['body' => 'secret text']);
    $message->delete();

    $data = MessageData::fromModel($message->fresh(['room']) ?? Message::withTrashed()->find($message->id));

    expect($data->deleted)->toBeTrue()->and($data->body)->toBeNull();
});

it('marks rooms read monotonically and counts unread per room', function (): void {
    $room = Room::factory()->create();
    $reader = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $reader->getKey()]);
    $messages = Message::factory()->for($room)->count(3)->create()->sortBy('id')->values();

    $mark = app(MarkRoomReadHandler::class);
    $counters = app(GetUnreadCountersHandler::class);

    expect($counters->handle(new GetUnreadCountersQuery((string) $reader->getKey())))
        ->toBe([$room->id => 3]);

    $mark->handle(new MarkRoomReadCommand($room->id, (string) $reader->getKey(), $messages[1]->id));
    expect($counters->handle(new GetUnreadCountersQuery((string) $reader->getKey())))
        ->toBe([$room->id => 1]);

    // Отметка не движется назад.
    $mark->handle(new MarkRoomReadCommand($room->id, (string) $reader->getKey(), $messages[0]->id));
    expect(RoomMember::query()->where('user_id', $reader->getKey())->value('last_read_message_id'))
        ->toBe($messages[1]->id);
});
