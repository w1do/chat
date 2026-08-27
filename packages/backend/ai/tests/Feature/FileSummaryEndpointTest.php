<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Vendor\Ai\AiServiceProvider;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;
use Vendor\Ai\Infrastructure\Jobs\SummarizeFileJob;
use Vendor\Ai\Testing\FakeFileSummaryProvider;
use Vendor\Ai\Testing\FakeSummaryPublisher;
use Vendor\Ai\Testing\FakeSummarySource;
use Vendor\Identity\Domain\Models\User;

/** Сообщение с документом в переписке, доступной читателю. */
function endpointTarget(string $name = 'dogovor.txt', string $mime = 'text/plain'): SummaryTarget
{
    $target = new SummaryTarget(
        roomId: (string) Str::ulid(),
        messageId: (string) Str::ulid(),
        attachmentId: (string) Str::uuid(),
        fileName: $name,
        mimeType: $mime,
        size: 2048,
    );

    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $source->add($target, 'Договор аренды. Срок один год. Оплата ежемесячно.');

    return $target;
}

beforeEach(function (): void {
    app()->instance(FileSummaryProvider::class, new FakeFileSummaryProvider);
    config()->set('ai.file_summary.job.tries', 1);
});

it('accepts the request with 202 and enqueues the job', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => 'Что тут написано, @ai?',
    ])->assertStatus(202)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.summary', null)
        ->assertJsonPath('data.file.name', 'dogovor.txt')
        ->assertJsonPath('data.message_id', $target->messageId);

    expect($response->json('data.id'))->not->toBeNull()
        ->and($response->json('data.lead_in'))->toBe('Вот что:');

    Queue::assertPushed(SummarizeFileJob::class);
});

it('replays the same operation for a repeated idempotency key', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();

    $payload = [
        'message_id' => $target->messageId,
        'body' => '@ai перескажи',
        'idempotency_key' => 'abc-123',
    ];

    $first = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', $payload)->assertStatus(202);
    $second = $this->postJson('/api/v1/ai/file-summaries', $payload)->assertStatus(200);

    expect($second->json('data.id'))->toBe($first->json('data.id'));
    Queue::assertPushed(SummarizeFileJob::class, 1);
});

it('rejects invalid input with 422', function (array $payload): void {
    Queue::fake();
    endpointTarget();
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', $payload)->assertStatus(422);
    Queue::assertNothingPushed();
})->with([
    'без сообщения' => [['body' => '@ai']],
    'без черновика' => [['message_id' => '01j8zc2v9q4t5w6x7y8z9abcde']],
    'без триггера' => [['message_id' => '01j8zc2v9q4t5w6x7y8z9abcde', 'body' => 'просто ответ']],
    'чужой язык' => [['message_id' => '01j8zc2v9q4t5w6x7y8z9abcde', 'body' => '@ai', 'locale' => 'ja']],
    'кривой ключ' => [['message_id' => '01j8zc2v9q4t5w6x7y8z9abcde', 'body' => '@ai', 'idempotency_key' => 'плохой ключ!']],
]);

it('rejects a message without a supported document with 422', function (): void {
    Queue::fake();
    $archive = new SummaryTarget(
        roomId: (string) Str::ulid(),
        messageId: (string) Str::ulid(),
        attachmentId: (string) Str::uuid(),
        fileName: 'arhiv.zip',
        mimeType: 'application/zip',
        size: 2048,
    );
    app(SummarySource::class)->add($archive);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $archive->messageId,
        'body' => '@ai',
    ])->assertStatus(422)->assertJsonPath('errors.message_id.0', fn (string $message): bool => str_contains($message, '.pdf'));
});

it('answers 403 to someone outside the room and 404 for a hidden conversation', function (): void {
    Queue::fake();
    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $source->denied = true;
    $user = User::factory()->create();

    $payload = ['message_id' => (string) Str::ulid(), 'body' => '@ai'];

    $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', $payload)->assertStatus(403);

    $source->hidden = true;
    $this->postJson('/api/v1/ai/file-summaries', $payload)->assertStatus(404);
});

it('answers 429 when the quota is exhausted', function (): void {
    Queue::fake();
    config()->set('ai.file_summary.per_user_hourly', 1);
    $first = endpointTarget();
    $second = endpointTarget('akt.txt');
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $first->messageId,
        'body' => '@ai',
    ])->assertStatus(202);

    $this->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $second->messageId,
        'body' => '@ai',
    ])->assertStatus(429);
});

it('answers 503 when the administrator disabled AI', function (): void {
    Queue::fake();
    $target = endpointTarget();
    config()->set('ai.enabled', false);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => '@ai',
    ])->assertStatus(503);

    Queue::assertNothingPushed();
});

it('requires authentication', function (): void {
    $this->postJson('/api/v1/ai/file-summaries', ['message_id' => (string) Str::ulid(), 'body' => '@ai'])
        ->assertStatus(401);
});

it('returns the finished draft over HTTP after a reconnect', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => '@ai',
    ])->json('data.id');

    // Событие могло не застать клиента — состояние читается запросом.
    app()->call([new SummarizeFileJob($id), 'handle']);

    $this->getJson("/api/v1/ai/file-summaries/{$id}")
        ->assertOk()
        ->assertJsonPath('data.status', 'succeeded')
        ->assertJsonPath('data.error_code', null)
        ->assertJsonPath('data.summary', fn (?string $summary): bool => $summary !== null
            && mb_strlen($summary) >= 500
            && mb_strlen($summary) <= 800);
});

it('hides someone else operation behind 404', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => '@ai',
    ])->json('data.id');

    $this->actingAs($stranger)->getJson("/api/v1/ai/file-summaries/{$id}")->assertStatus(404);
    $this->postJson("/api/v1/ai/file-summaries/{$id}/publish")->assertStatus(404);
});

it('publishes the draft only on confirmation and refuses to publish twice', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => '@ai',
    ])->json('data.id');

    // Пока не подтвердили — в комнате ничего нет.
    $this->postJson("/api/v1/ai/file-summaries/{$id}/publish")->assertStatus(409);

    app()->call([new SummarizeFileJob($id), 'handle']);

    /** @var FakeSummaryPublisher $publisher */
    $publisher = app(SummaryPublisher::class);
    expect($publisher->published)->toBeEmpty();

    $this->postJson("/api/v1/ai/file-summaries/{$id}/publish")
        ->assertStatus(201)
        ->assertJsonPath('data.status', 'published')
        ->assertJsonPath('data.published_message_id', fn (?string $value): bool => $value !== null);

    expect($publisher->published)->toHaveCount(1)
        ->and($publisher->published[0]['body'])->toStartWith('Вот что:');

    $this->postJson("/api/v1/ai/file-summaries/{$id}/publish")->assertStatus(409);
    expect($publisher->published)->toHaveCount(1);
});

it('refuses to boot in development when the provider key is missing', function (): void {
    $app = app();
    $app['config']->set('ai.enabled', true);
    $app['config']->set('ai.provider', 'polza');
    $app['config']->set('ai.providers.polza.api_key', null);

    // На рабочей установке приложение не падает: помощник просто молчит.
    $app['env'] = 'production';
    (new AiServiceProvider($app))->boot();

    // В разработке пустой ключ при включённом помощнике — это опечатка.
    $app['env'] = 'local';
    expect(fn () => (new AiServiceProvider($app))->boot())->toThrow(RuntimeException::class);
});

it('refuses to publish an expired draft', function (): void {
    Queue::fake();
    $target = endpointTarget();
    $user = User::factory()->create();

    $id = $this->actingAs($user)->postJson('/api/v1/ai/file-summaries', [
        'message_id' => $target->messageId,
        'body' => '@ai',
    ])->json('data.id');

    app()->call([new SummarizeFileJob($id), 'handle']);

    AiFileSummary::query()->whereKey($id)->update(['created_at' => now()->subDays(2)]);

    $this->postJson("/api/v1/ai/file-summaries/{$id}/publish")->assertStatus(409);
    expect(app(SummaryPublisher::class)->published)->toBeEmpty();
});
