<?php

declare(strict_types=1);

use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Vendor\Chat\Application\Commands\DeleteMessageCommand;
use Vendor\Chat\Application\Commands\EditMessageCommand;
use Vendor\Chat\Application\Commands\SendMessageCommand;
use Vendor\Chat\Application\Handlers\Commands\DeleteMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\EditMessageHandler;
use Vendor\Chat\Application\Handlers\Commands\SendMessageHandler;
use Vendor\Chat\Application\Handlers\Queries\SearchMessagesHandler;
use Vendor\Chat\Application\Queries\SearchMessagesQuery;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Contracts\SearchUnavailable;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;
use Vendor\Chat\Domain\ValueObjects\SearchConfig;
use Vendor\Chat\Infrastructure\Search\NullMessageIndex;
use Vendor\Chat\Infrastructure\Search\SyncMessageIndexJob;
use Vendor\Chat\Infrastructure\Search\TypesenseMessageIndex;
use Vendor\Chat\Testing\FakeMessageIndex;
use Vendor\Identity\Domain\Models\User;

/** Комната с участником: возвращает [room, user]. */
function searchRoomWithMember(): array
{
    $room = Room::factory()->create();
    $user = User::factory()->create();
    RoomMember::factory()->create(['room_id' => $room->id, 'user_id' => $user->getKey(), 'role' => RoomRole::Member]);

    return [$room, $user];
}

it('rejects a production search configuration without required values', function (): void {
    expect(fn () => SearchConfig::fromArray([
        'enabled' => true,
        'driver' => 'typesense',
        'collection' => 'messages',
        'host' => 'typesense',
        'port' => 8108,
        'api_key' => '',
    ]))->toThrow(InvalidArgumentException::class, 'Search configuration is missing [api_key].');

    expect(fn () => SearchConfig::fromArray(['enabled' => true, 'driver' => 'elastic']))
        ->toThrow(InvalidArgumentException::class);

    // Выключенный поиск валиден и не требует ключа.
    expect(SearchConfig::fromArray(['enabled' => false, 'driver' => 'typesense'])->enabled)->toBeFalse();
});

it('keeps only safe fields in the index document', function (): void {
    $message = Message::factory()->create(['body' => 'секрет тут']);

    expect(array_keys(IndexedMessage::fromModel($message)->toDocument()))
        ->toBe(['id', 'room_id', 'author_id', 'body', 'created_at']);
});

it('indexes a message after commit and not after a rollback', function (): void {
    config()->set('chat.search.enabled', true);
    Bus::fake();
    [$room, $author] = searchRoomWithMember();

    $result = app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: 'найди меня',
    ));

    Bus::assertDispatched(SyncMessageIndexJob::class, fn (SyncMessageIndexJob $job): bool => $job->messageId === $result['message']->id);

    // Откатившаяся строка в индекс не попадает: задание читает PostgreSQL,
    // и после отката читать уже нечего.
    $rolledBackId = null;

    try {
        DB::transaction(function () use ($room, $author, &$rolledBackId): void {
            $sent = app(SendMessageHandler::class)->handle(new SendMessageCommand(
                roomId: $room->id,
                authorId: (string) $author->getKey(),
                body: 'этого не будет',
            ));

            $rolledBackId = $sent['message']->id;

            throw new RuntimeException('rollback');
        });
    } catch (RuntimeException) {
        // ожидаемо
    }

    $index = new FakeMessageIndex;
    (new SyncMessageIndexJob((string) $rolledBackId))->handle($index);

    expect($index->documents)->toBe([]);
});

it('re-indexes an edited message and removes a deleted one', function (): void {
    $index = new FakeMessageIndex;
    app()->instance(MessageIndex::class, $index);

    [$room, $author] = searchRoomWithMember();

    $sent = app(SendMessageHandler::class)->handle(new SendMessageCommand(
        roomId: $room->id,
        authorId: (string) $author->getKey(),
        body: 'первая версия',
    ));

    $id = $sent['message']->id;
    (new SyncMessageIndexJob($id))->handle($index);
    expect($index->documents[$id]['body'])->toBe('первая версия');

    app(EditMessageHandler::class)->handle(new EditMessageCommand(
        messageId: $id,
        body: 'вторая версия',
    ));
    (new SyncMessageIndexJob($id))->handle($index);
    expect($index->documents[$id]['body'])->toBe('вторая версия');

    app(DeleteMessageHandler::class)->handle(new DeleteMessageCommand(messageId: $id));
    (new SyncMessageIndexJob($id))->handle($index);
    expect($index->documents)->not->toHaveKey($id);
});

it('is idempotent and never indexes system entries', function (): void {
    $index = new FakeMessageIndex;
    $message = Message::factory()->create();
    $system = Message::factory()->system()->create();

    (new SyncMessageIndexJob($message->id))->handle($index);
    (new SyncMessageIndexJob($message->id))->handle($index);
    (new SyncMessageIndexJob($system->id))->handle($index);
    (new SyncMessageIndexJob('01j0000000000000000000000'))->handle($index);

    expect($index->documents)->toHaveCount(1)->toHaveKey($message->id);
});

it('returns results only from rooms the user belongs to', function (): void {
    $index = new FakeMessageIndex;
    $handler = new SearchMessagesHandler($index);

    [$room, $member] = searchRoomWithMember();
    $stranger = User::factory()->create();
    $private = Room::factory()->create(['visibility' => 'private']);

    $mine = Message::factory()->create(['room_id' => $room->id, 'author_id' => $member->getKey(), 'body' => 'общий секрет']);
    $theirs = Message::factory()->create(['room_id' => $private->id, 'body' => 'приватный секрет']);

    foreach ([$mine, $theirs] as $message) {
        $index->index(IndexedMessage::fromModel($message));
    }

    $found = $handler->handle(new SearchMessagesQuery(term: 'секрет'), (string) $member->getKey());
    expect($found)->toHaveCount(1)->and($found[0]->id)->toBe($mine->id);

    // Не участник не видит ни сообщения, ни факта его существования.
    expect($handler->handle(new SearchMessagesQuery(term: 'секрет'), (string) $stranger->getKey()))->toBe([]);
});

it('does not return a soft-deleted message even if the index lags', function (): void {
    $index = new FakeMessageIndex;
    $handler = new SearchMessagesHandler($index);
    [$room, $member] = searchRoomWithMember();

    $message = Message::factory()->create(['room_id' => $room->id, 'body' => 'исчезающий текст']);
    $index->index(IndexedMessage::fromModel($message));
    $message->delete();

    expect($handler->handle(new SearchMessagesQuery(term: 'исчезающий'), (string) $member->getKey()))->toBe([]);
});

it('reports an unavailable index instead of pretending there are no results', function (): void {
    $index = new FakeMessageIndex;
    $index->unavailable = true;
    [$room, $member] = searchRoomWithMember();

    expect(fn () => (new SearchMessagesHandler($index))->handle(
        new SearchMessagesQuery(term: 'что угодно'),
        (string) $member->getKey(),
    ))->toThrow(SearchUnavailable::class);

    // Выключенный поиск ведёт себя так же явно.
    expect(fn () => (new NullMessageIndex)->search('что угодно', ['r'], 10))->toThrow(SearchUnavailable::class);
});

it('turns a Typesense outage into SearchUnavailable without leaking the key', function (): void {
    Http::fake(['*' => Http::response('the api key is bad: xyz', 401)]);

    $index = new TypesenseMessageIndex(app(HttpFactory::class), SearchConfig::fromArray([
        'enabled' => true,
        'driver' => 'typesense',
        'collection' => 'messages',
        'host' => 'typesense',
        'port' => 8108,
        'api_key' => 'super-secret-key',
    ]));

    try {
        $index->search('привет', ['r1'], 10);
        $this->fail('SearchUnavailable expected');
    } catch (SearchUnavailable $exception) {
        expect($exception->getMessage())->not->toContain('super-secret-key')
            ->and($exception->getMessage())->not->toContain('xyz');
    }
});

it('rebuilds the index from PostgreSQL', function (): void {
    $index = new FakeMessageIndex;
    app()->instance(MessageIndex::class, $index);

    Message::factory()->count(3)->create(['body' => 'история']);
    Message::factory()->system()->create();
    Message::factory()->create(['body' => 'удалённое'])->delete();

    $this->artisan('chat:search-reindex', ['--fresh' => true])
        ->expectsOutputToContain('Indexed 3 messages.')
        ->assertSuccessful();

    expect($index->recreated)->toBeTrue()->and($index->documents)->toHaveCount(3);
});
