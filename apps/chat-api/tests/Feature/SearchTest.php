<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Vendor\Chat\Domain\Contracts\MessageIndex;
use Vendor\Chat\Domain\Enums\RoomRole;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;
use Vendor\Chat\Domain\ValueObjects\IndexedMessage;
use Vendor\Chat\Testing\FakeMessageIndex;

uses(RefreshDatabase::class);

/** Индекс в памяти вместо Typesense: обычный CI не поднимает поисковый сервис. */
function fakeSearchIndex(): FakeMessageIndex
{
    $index = new FakeMessageIndex;
    app()->instance(MessageIndex::class, $index);

    return $index;
}

it('finds a message in a room the user belongs to', function (): void {
    $index = fakeSearchIndex();
    $room = Room::factory()->create();
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $user->getKey()]);

    $message = Message::factory()->create([
        'room_id' => $room->id,
        'author_id' => $user->getKey(),
        'body' => 'рецепт борща',
    ]);
    $index->index(IndexedMessage::fromModel($message));

    $this->actingAs($user)->getJson('/api/v1/search/messages?q='.urlencode('борща'))
        ->assertOk()
        ->assertJsonPath('data.0.id', $message->id)
        ->assertJsonPath('data.0.body', 'рецепт борща')
        ->assertJsonPath('data.0.author_name', $user->name);
});

it('never reveals private room content to a non-member', function (): void {
    $index = fakeSearchIndex();
    $private = Room::factory()->privateRoom()->create();
    $outsider = User::factory()->create();

    $index->index(IndexedMessage::fromModel(
        Message::factory()->create(['room_id' => $private->id, 'body' => 'закрытая переписка']),
    ));

    $this->actingAs($outsider)->getJson('/api/v1/search/messages?q='.urlencode('закрытая'))
        ->assertOk()
        ->assertJsonPath('data', []);
});

it('answers with a documented degraded response when the index is down', function (): void {
    $index = fakeSearchIndex();
    $index->unavailable = true;
    $room = Room::factory()->create();
    $user = User::factory()->create();
    RoomMember::factory()->for($room)->role(RoomRole::Member)->create(['user_id' => $user->getKey()]);

    $response = $this->actingAs($user)->getJson('/api/v1/search/messages?q='.urlencode('что угодно'));

    $response->assertStatus(503)->assertJsonPath('code', 'service_unavailable');
    expect($response->json('message'))->not->toContain('Typesense');
});

it('validates the query', function (): void {
    fakeSearchIndex();

    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/search/messages?q=a')
        ->assertStatus(422);
});

it('requires authentication', function (): void {
    fakeSearchIndex();

    $this->getJson('/api/v1/search/messages?q='.urlencode('привет'))->assertStatus(401);
});
