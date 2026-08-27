<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Vendor\Administration\Domain\Models\AuditLog;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\Models\AiRequest;
use Vendor\Ai\Infrastructure\Jobs\SummarizeFileJob;
use Vendor\Ai\Testing\FakeFileSummaryProvider;
use Vendor\Chat\Domain\Events\MessageCreated;
use Vendor\Chat\Domain\Models\Message;
use Vendor\Chat\Domain\Models\Room;
use Vendor\Chat\Domain\Models\RoomMember;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('media');
    config()->set('ai.enabled', true);
    config()->set('ai.file_summary.job.tries', 1);
    app()->instance(FileSummaryProvider::class, new FakeFileSummaryProvider);
});

/** Комната с участником и сообщением, к которому приложен документ. */
function roomWithDocument(string $name = 'dogovor.txt', string $contents = 'Договор аренды. Срок один год.'): array
{
    $room = Room::factory()->privateRoom()->create();
    $author = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $author->getKey()]);

    $attachment = test()->actingAs($author)
        ->post("/api/v1/rooms/{$room->id}/attachments", [
            'file' => UploadedFile::fake()->createWithContent($name, $contents),
        ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data.id');

    $messageId = test()->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Посмотрите документ',
        'attachments' => [$attachment],
    ])->assertCreated()->json('data.id');

    return [$room, $author, $messageId];
}

it('summarizes a replied document and publishes it only after confirmation', function (): void {
    Queue::fake();
    [$room, $author, $messageId] = roomWithDocument();

    $reader = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $reader->getKey()]);

    $summaryId = $this->actingAs($reader)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $messageId,
        'body' => '@ai что здесь написано?',
    ])->assertStatus(202)->json('data.id');

    Queue::assertPushed(SummarizeFileJob::class);

    // Задание запускается отдельно: очередь в тестах не нужна.
    app()->call([new SummarizeFileJob($summaryId), 'handle']);

    $draft = $this->getJson("/api/v1/ai/file-summaries/{$summaryId}")
        ->assertOk()
        ->assertJsonPath('data.status', 'succeeded')
        ->json('data.summary');

    expect(mb_strlen((string) $draft))->toBeGreaterThanOrEqual(500)->toBeLessThanOrEqual(800);

    // Пока не подтвердили — в комнате только исходное сообщение.
    expect(Message::query()->where('room_id', $room->id)->count())->toBe(1);

    Event::fake([MessageCreated::class]);

    $published = $this->postJson("/api/v1/ai/file-summaries/{$summaryId}/publish")
        ->assertStatus(201)
        ->assertJsonPath('data.status', 'published')
        ->json('data.published_message_id');

    Event::assertDispatched(MessageCreated::class);

    /** @var Message $message */
    $message = Message::query()->findOrFail($published);

    expect($message->author_id)->toBe((string) $reader->getKey())
        ->and($message->room_id)->toBe($room->id)
        ->and($message->reply_to_id)->toBe($messageId)
        ->and($message->body)->toStartWith('Вот что:')
        ->and($message->body)->toContain((string) $draft)
        // Автор — человек, а не помощник, и это обычное сообщение комнаты.
        ->and($message->author_id)->not->toBe((string) $author->getKey());
});

it('forbids a summary of a message in a room the requester is not in', function (): void {
    Queue::fake();
    [, , $messageId] = roomWithDocument();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $messageId,
        'body' => '@ai',
    ])->assertStatus(403);

    expect(AiFileSummary::query()->count())->toBe(0);
    Queue::assertNotPushed(SummarizeFileJob::class);
});

it('refuses a message whose attachment is not a document', function (): void {
    Queue::fake();
    $room = Room::factory()->privateRoom()->create();
    $member = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $member->getKey()]);

    $attachment = $this->actingAs($member)
        ->post("/api/v1/rooms/{$room->id}/attachments", [
            'file' => UploadedFile::fake()->image('photo.jpg', 64, 64),
        ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->json('data.id');

    $messageId = $this->postJson("/api/v1/rooms/{$room->id}/messages", [
        'body' => 'Фото',
        'attachments' => [$attachment],
    ])->assertCreated()->json('data.id');

    $this->postJson('/api/v1/ai/file-summaries', ['message_id' => $messageId, 'body' => '@ai'])
        ->assertStatus(422);
});

it('records the summary in the audit log without the document text', function (): void {
    Queue::fake();
    [, , $messageId] = roomWithDocument(contents: 'Совершенно секретный текст договора.');
    $reader = User::factory()->create();
    RoomMember::factory()->for(Room::query()->firstOrFail())->create(['user_id' => $reader->getKey()]);

    $summaryId = $this->actingAs($reader)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $messageId,
        'body' => '@ai',
    ])->assertStatus(202)->json('data.id');

    app()->call([new SummarizeFileJob($summaryId), 'handle']);

    $entry = AuditLog::query()->where('action', 'ai.file_summary.succeeded')->firstOrFail();

    expect($entry->subject_id)->toBe($summaryId)
        ->and($entry->actor_id)->toBe((string) $reader->getKey())
        ->and($entry->context['provider'])->toBe('fake')
        ->and($entry->context['mime_type'])->toBe('text/plain');

    $stored = json_encode($entry->toArray(), JSON_UNESCAPED_UNICODE);
    expect($stored)->not->toContain('Совершенно секретный')
        ->not->toContain((string) AiFileSummary::query()->firstOrFail()->summary);

    // Расход записан в общий журнал обращений к AI.
    expect(AiRequest::query()->where('operation', 'summarize_file')->firstOrFail()->status->value)
        ->toBe('succeeded');
});

it('keeps chat working while the summary provider is unavailable', function (): void {
    Queue::fake();
    app()->instance(FileSummaryProvider::class, FakeFileSummaryProvider::failing(timedOut: true));
    [$room, , $messageId] = roomWithDocument();
    $reader = User::factory()->create();
    RoomMember::factory()->for($room)->create(['user_id' => $reader->getKey()]);

    $summaryId = $this->actingAs($reader)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $messageId,
        'body' => '@ai',
    ])->assertStatus(202)->json('data.id');

    app()->call([new SummarizeFileJob($summaryId), 'handle']);

    $this->getJson("/api/v1/ai/file-summaries/{$summaryId}")
        ->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.error_code', 'provider_timeout')
        ->assertJsonPath('data.summary', null);

    // Обычная отправка сообщения не страдает.
    $this->postJson("/api/v1/rooms/{$room->id}/messages", ['body' => 'Работает и без помощника'])
        ->assertCreated();
});
