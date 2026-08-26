<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;

uses(RefreshDatabase::class);

/** Начать диалог и вернуть его комнату. */
function startDialog(User $initiator, User $counterpart): Room
{
    $id = test()->actingAs($initiator)
        ->postJson('/api/v1/direct-conversations', ['user_id' => (string) $counterpart->getKey()])
        ->json('data.id');

    return Room::query()->findOrFail($id);
}

// --- Вид не назначить запросом (1.2) ---

it('ignores an attempt to smuggle the kind through room creation or update', function (): void {
    $user = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/rooms', [
        'name' => 'Хитрая',
        'visibility' => 'private',
        'kind' => 'direct',
        'direct_key' => 'a:b',
    ])->assertCreated()->assertJsonPath('data.kind', 'room')->json('data.id');

    $this->actingAs($user)->patchJson("/api/v1/rooms/{$id}", ['name' => 'Всё ещё хитрая', 'kind' => 'direct'])
        ->assertOk()
        ->assertJsonPath('data.kind', 'room');

    expect(Room::query()->findOrFail($id)->isDirect())->toBeFalse();
});

// --- Адрес начала диалога (2.3) ---

it('starts a conversation once and reopens it on a repeat call', function (): void {
    $anna = User::factory()->create(['username' => 'anna', 'name' => 'Анна']);
    $boris = User::factory()->create(['username' => 'boris', 'name' => 'Борис']);

    $first = $this->actingAs($anna)
        ->postJson('/api/v1/direct-conversations', ['user_id' => (string) $boris->getKey()])
        ->assertCreated()
        ->assertJsonPath('data.kind', 'direct')
        ->assertJsonPath('data.counterpart.username', 'boris');

    $again = $this->actingAs($anna)
        ->postJson('/api/v1/direct-conversations', ['user_id' => (string) $boris->getKey()])
        ->assertOk();

    expect($again->json('data.id'))->toBe($first->json('data.id'))
        ->and(Room::query()->where('kind', 'direct')->count())->toBe(1);
});

it('rejects a conversation with yourself and requires authentication', function (): void {
    $anna = User::factory()->create();

    // Гость — сначала: actingAs действует до конца теста.
    $this->postJson('/api/v1/direct-conversations', ['user_id' => (string) $anna->getKey()])
        ->assertStatus(401);

    $this->actingAs($anna)
        ->postJson('/api/v1/direct-conversations', ['user_id' => (string) $anna->getKey()])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed');
});

it('finds a counterpart by nickname without offering yourself', function (): void {
    $anna = User::factory()->create(['username' => 'anka', 'name' => 'Анна']);
    User::factory()->create(['username' => 'anton', 'name' => 'Антон']);

    $usernames = collect($this->actingAs($anna)
        ->getJson('/api/v1/direct-conversation-candidates?query=an')
        ->assertOk()
        ->json('data'))->pluck('username');

    expect($usernames)->toContain('anton')->not->toContain('anka');
});

// --- Пустой диалог и список (2.4, 4.1) ---

it('keeps an empty conversation off the counterpart list until the first message arrives', function (): void {
    $anna = User::factory()->create(['name' => 'Анна']);
    $boris = User::factory()->create(['name' => 'Борис']);
    $outsider = User::factory()->create();

    $room = startDialog($anna, $boris);

    $listOf = fn (User $user): array => collect($this->actingAs($user)->getJson('/api/v1/rooms')->json('data'))
        ->pluck('id')
        ->all();

    expect($listOf($anna))->toContain($room->id)
        ->and($listOf($boris))->not->toContain($room->id)
        ->and($listOf($outsider))->not->toContain($room->id);

    $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет!'])->assertCreated();

    expect($listOf($boris))->toContain($room->id)
        ->and($listOf($outsider))->not->toContain($room->id);
});

// --- Диалог — не комната (3.2, 3.3 и запреты по HTTP) ---

it('refuses to leave a conversation', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $room = startDialog($anna, $boris);

    $this->actingAs($boris)->deleteJson("/api/v1/rooms/{$room->id}/members/me")
        ->assertStatus(403)
        ->assertJsonPath('code', 'forbidden');
});

it('refuses room actions over a conversation even by direct request', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $vera = User::factory()->create();
    $room = startDialog($anna, $boris);

    $this->actingAs($anna)->patchJson("/api/v1/rooms/{$room->id}", ['name' => 'Наша'])->assertStatus(403);
    $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/archive")->assertStatus(403);
    $this->actingAs($anna)->deleteJson("/api/v1/rooms/{$room->id}")->assertStatus(403);
    $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/members", ['user_id' => (string) $vera->getKey()])
        ->assertStatus(403);

    expect(Room::query()->whereKey($room->id)->exists())->toBeTrue()
        ->and($room->members()->count())->toBe(2);
});

it('pretends a foreign conversation does not exist', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $outsider = User::factory()->create();
    $room = startDialog($anna, $boris);

    $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Секрет'])->assertCreated();

    $this->actingAs($outsider)->getJson("/api/v1/rooms/{$room->id}")
        ->assertStatus(404)
        ->assertJsonPath('code', 'not_found');
    $this->actingAs($outsider)->getJson("/api/v1/rooms/{$room->id}/messages")->assertStatus(404);
    $this->actingAs($outsider)->postJson("/api/v1/rooms/{$room->id}/members/me")->assertStatus(403);
});

// --- Переписка в диалоге живёт по комнатным правилам (3.4) ---

it('supports the full messaging toolset inside a conversation', function (): void {
    $anna = User::factory()->create(['name' => 'Анна']);
    $boris = User::factory()->create(['name' => 'Борис']);
    $room = startDialog($anna, $boris);

    // Отправка и упоминание.
    $first = $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Привет, @boris!',
        'mentions' => [(string) $boris->getKey()],
    ])->assertCreated()->json('data.id');

    // Ответ.
    $reply = $this->actingAs($boris)->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Привет-привет',
        'reply_to_id' => $first,
    ])->assertCreated()->assertJsonPath('data.reply_to_id', $first)->json('data.id');

    // Реакция.
    $this->actingAs($anna)->postJson("/api/v1/messages/{$reply}/reactions", ['emoji' => '👍'])
        ->assertOk();

    // Редактирование своего сообщения.
    $this->actingAs($anna)->patchJson("/api/v1/messages/{$first}", ['body' => 'Привет, Борис!'])
        ->assertOk()
        ->assertJsonPath('data.body', 'Привет, Борис!');

    // Чужое сообщение в диалоге не правится и не удаляется: ролей нет.
    $this->actingAs($anna)->patchJson("/api/v1/messages/{$reply}", ['body' => 'Подмена'])->assertStatus(403);
    $this->actingAs($anna)->deleteJson("/api/v1/messages/{$reply}")->assertStatus(403);

    // Отметка о прочтении.
    $this->actingAs($boris)->postJson("/api/v1/rooms/{$room->id}/read", ['last_read_message_id' => $reply])
        ->assertNoContent();

    // Мягкое удаление своего.
    $this->actingAs($boris)->deleteJson("/api/v1/messages/{$reply}")->assertNoContent();

    expect(Message::withTrashed()->whereKey($reply)->first()?->trashed())->toBeTrue();

    // История с пагинацией отвечает участнику.
    $this->actingAs($boris)->getJson("/api/v1/rooms/{$room->id}/messages?limit=1")
        ->assertOk()
        ->assertJsonStructure(['data', 'meta' => ['next_cursor']]);
});

// --- Скрытие (4.4) ---

it('hides a conversation for the participant and keeps the history intact', function (): void {
    $anna = User::factory()->create();
    $boris = User::factory()->create();
    $outsider = User::factory()->create();
    $room = startDialog($anna, $boris);

    $this->actingAs($anna)->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Привет!'])->assertCreated();

    // Посторонний диалог не скрывает: для него его нет.
    $this->actingAs($outsider)->postJson("/api/v1/direct-conversations/{$room->id}/hide")->assertStatus(404);

    $this->actingAs($anna)->postJson("/api/v1/direct-conversations/{$room->id}/hide")->assertNoContent();

    $list = collect($this->actingAs($anna)->getJson('/api/v1/rooms')->json('data'))->pluck('id');
    expect($list)->not->toContain($room->id)
        ->and(Message::query()->where('room_id', $room->id)->count())->toBe(1);

    // Скрывший по-прежнему может открыть переписку напрямую — история цела.
    $this->actingAs($anna)->getJson("/api/v1/rooms/{$room->id}/messages")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('refuses to hide an ordinary room', function (): void {
    $user = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/rooms', [
        'name' => 'Комната',
        'visibility' => 'private',
    ])->json('data.id');

    $this->actingAs($user)->postJson("/api/v1/direct-conversations/{$id}/hide")->assertStatus(403);
});

// --- Поиск по списку (4.5) ---

it('searches rooms by name and conversations by counterpart name', function (): void {
    $me = User::factory()->create(['name' => 'Я']);
    $marina = User::factory()->create(['username' => 'marina', 'name' => 'Марина']);

    $this->actingAs($me)->postJson('/api/v1/rooms', ['name' => 'Морская', 'visibility' => 'public'])->assertCreated();
    startDialog($me, $marina);

    $found = collect($this->actingAs($me)->getJson('/api/v1/rooms?search=Марин')->json('data'));

    expect($found)->toHaveCount(1)
        ->and($found->first()['kind'])->toBe('direct')
        ->and($found->first()['counterpart']['name'])->toBe('Марина');

    $rooms = collect($this->actingAs($me)->getJson('/api/v1/rooms?search=Морск')->json('data'));

    expect($rooms)->toHaveCount(1)
        ->and($rooms->first()['name'])->toBe('Морская');
});

// --- Представление переписки (5.1) ---

it('describes a conversation by kind and counterpart and a room by its name', function (): void {
    $anna = User::factory()->create(['username' => 'anna', 'name' => 'Анна']);
    $boris = User::factory()->create(['username' => 'boris', 'name' => 'Борис']);

    $roomId = $this->actingAs($anna)->postJson('/api/v1/rooms', [
        'name' => 'Общая',
        'visibility' => 'public',
    ])->json('data.id');

    $dialog = startDialog($anna, $boris);

    // У комнаты — название и никакого собеседника (отсутствует, а не пуст).
    $this->actingAs($anna)->getJson("/api/v1/rooms/{$roomId}")
        ->assertOk()
        ->assertJsonPath('data.kind', 'room')
        ->assertJsonPath('data.name', 'Общая')
        ->assertJsonPath('data.counterpart', null);

    // У диалога — вид, собеседник и никакого названия.
    $this->actingAs($anna)->getJson("/api/v1/rooms/{$dialog->id}")
        ->assertOk()
        ->assertJsonPath('data.kind', 'direct')
        ->assertJsonPath('data.name', null)
        ->assertJsonPath('data.topic', null)
        ->assertJsonPath('data.counterpart.id', (string) $boris->getKey())
        ->assertJsonPath('data.counterpart.username', 'boris')
        ->assertJsonPath('data.counterpart.name', 'Борис');

    // Каждый видит собеседником другого.
    $this->actingAs($boris)->getJson("/api/v1/rooms/{$dialog->id}")
        ->assertOk()
        ->assertJsonPath('data.counterpart.username', 'anna');
});
