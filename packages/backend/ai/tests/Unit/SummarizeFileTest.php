<?php

declare(strict_types=1);

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\PublishFileSummaryCommand;
use Vendor\Ai\Application\Commands\SummarizeFileCommand;
use Vendor\Ai\Application\Handlers\Commands\PublishFileSummaryHandler;
use Vendor\Ai\Application\Handlers\Commands\SummarizeFileHandler;
use Vendor\Ai\Application\SummaryNotAvailable;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\Metrics;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Contracts\SummaryTargetDenied;
use Vendor\Ai\Domain\Contracts\SummaryTargetUnsupported;
use Vendor\Ai\Domain\Enums\FileSummaryError;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Events\FileSummaryRecorded;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\Models\AiRequest;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;
use Vendor\Ai\Infrastructure\Broadcasting\FileSummaryUpdatedV1;
use Vendor\Ai\Infrastructure\Jobs\SummarizeFileJob;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Testing\FakeFileSummaryProvider;
use Vendor\Ai\Testing\FakeSummaryPublisher;
use Vendor\Ai\Testing\FakeSummarySource;
use Vendor\Ai\Testing\InMemoryMetrics;
use Vendor\Identity\Domain\Models\User;

function summaryTarget(string $name = 'dogovor.txt', string $mime = 'text/plain', int $size = 4096): SummaryTarget
{
    return new SummaryTarget(
        roomId: (string) Str::ulid(),
        messageId: (string) Str::ulid(),
        attachmentId: (string) Str::uuid(),
        fileName: $name,
        mimeType: $mime,
        size: $size,
    );
}

/** @return array{0: FakeSummarySource, 1: SummaryTarget} */
function sourceWithDocument(string $contents = 'Договор аренды. Срок один год. Оплата ежемесячно.'): array
{
    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $target = summaryTarget();
    $source->add($target, $contents);

    return [$source, $target];
}

function useSummaryProvider(FileSummaryProvider $provider): FileSummaryProvider
{
    app()->instance(FileSummaryProvider::class, $provider);

    return $provider;
}

it('records an ai_requests row and enqueues a job without calling the provider', function (): void {
    Bus::fake();
    $provider = useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    $result = app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: 'Посмотри @ai что тут',
    ));

    expect($result['replayed'])->toBeFalse()
        ->and($result['summary']->status)->toBe(FileSummaryStatus::Pending)
        ->and($result['summary']->summary)->toBeNull();

    $audit = AiRequest::query()->firstOrFail();
    expect($audit->operation)->toBe('summarize_file')
        ->and($audit->status->value)->toBe('pending')
        ->and(AiFileSummary::query()->firstOrFail()->ai_request_id)->toBe($audit->id);

    Bus::assertDispatched(SummarizeFileJob::class);
    // Поставщика в синхронной части нет: HTTP-ответ не ждёт внешний сервис.
    expect($provider->calls)->toBeEmpty();
});

it('refuses a reply that does not mention the trigger', function (): void {
    Bus::fake();
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: 'просто ответ без помощника',
    )))->toThrow(InvalidArgumentException::class);

    Bus::assertNothingDispatched();
});

it('does not treat a longer word as the trigger', function (): void {
    Bus::fake();
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: 'напиши @aidar завтра',
    )))->toThrow(InvalidArgumentException::class);
});

it('returns the same operation for a repeated idempotency key', function (): void {
    Bus::fake();
    useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    $command = new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: '@ai перескажи',
        idempotencyKey: 'retry-key-1',
    );

    $first = app(SummarizeFileHandler::class)->handle($command);
    $second = app(SummarizeFileHandler::class)->handle($command);

    expect($second['replayed'])->toBeTrue()
        ->and($second['summary']->id)->toBe($first['summary']->id)
        ->and(AiFileSummary::query()->count())->toBe(1);

    Bus::assertDispatchedTimes(SummarizeFileJob::class, 1);
});

it('rejects an unsupported or oversized document before the queue', function (): void {
    Bus::fake();
    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $user = User::factory()->create();

    $archive = summaryTarget('arhiv.zip', 'application/zip');
    $huge = summaryTarget('kniga.pdf', 'application/pdf', size: 50 * 1024 * 1024);
    $source->add($archive)->add($huge);

    foreach ([$archive, $huge] as $target) {
        expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
            userId: (string) $user->getKey(),
            messageId: $target->messageId,
            body: '@ai',
        )))->toThrow(SummaryTargetUnsupported::class);
    }

    expect(AiFileSummary::query()->count())->toBe(0);
    Bus::assertNothingDispatched();
});

it('passes through the refusal of the conversation', function (): void {
    Bus::fake();
    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $source->denied = true;
    $user = User::factory()->create();

    expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: (string) Str::ulid(),
        body: '@ai',
    )))->toThrow(SummaryTargetDenied::class);
});

it('enforces the per-user and per-install quotas', function (): void {
    Bus::fake();
    config()->set('ai.file_summary.per_user_hourly', 1);
    [$source, $first] = sourceWithDocument();
    $second = summaryTarget();
    $source->add($second);
    $user = User::factory()->create();

    app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $first->messageId,
        body: '@ai',
    ));

    expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $second->messageId,
        body: '@ai',
    )))->toThrow(QuotaExceeded::class);
});

it('refuses to start while the administrator disabled AI', function (): void {
    Bus::fake();
    config()->set('ai.enabled', false);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    expect(fn () => app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: '@ai',
    )))->toThrow(AiUnavailable::class);

    expect(AiFileSummary::query()->count())->toBe(0);
});

it('answers in the conversation locale and falls back to english', function (): void {
    Bus::fake();
    /** @var FakeSummarySource $source */
    $source = app(SummarySource::class);
    $source->locale = 'ru';
    [, $russian] = sourceWithDocument();
    $user = User::factory()->create();

    $result = app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $russian->messageId,
        body: '@ai',
    ));

    expect(AiFileSummary::query()->whereKey($result['summary']->id)->value('locale'))->toBe('ru');

    // Язык переписки не поддержан — пересказ уходит на английском.
    $source->locale = 'ja';
    config()->set('app.locale', 'ja');
    $other = summaryTarget();
    $source->add($other);

    $fallback = app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $other->messageId,
        body: '@ai',
    ));

    expect(AiFileSummary::query()->whereKey($fallback['summary']->id)->value('locale'))->toBe('en');
});

// --- Задание ---------------------------------------------------------------

it('summarizes the document, clamps the length and notifies the requester', function (): void {
    Event::fake([FileSummaryUpdatedV1::class, FileSummaryRecorded::class]);
    $provider = useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument(str_repeat('Договор аренды помещения. ', 200));
    $user = User::factory()->create();

    $summary = startSummary($user, $target);
    runSummaryJob($summary->id);

    $summary->refresh();

    expect($summary->status)->toBe(FileSummaryStatus::Succeeded)
        ->and(mb_strlen((string) $summary->summary))->toBeGreaterThanOrEqual(500)
        ->and(mb_strlen((string) $summary->summary))->toBeLessThanOrEqual(800)
        ->and($summary->model)->toBe('fake/model')
        ->and($summary->prompt_tokens)->toBe(800);

    // Поставщику ушёл только текст документа и окно длины.
    expect($provider->calls)->toHaveCount(1)
        ->and($provider->calls[0]['document'])->toStartWith('Договор аренды помещения.')
        ->and($provider->calls[0]['min'])->toBe(500);

    // Аудит расхода дописан в общий журнал.
    $audit = AiRequest::query()->firstOrFail();
    expect($audit->status->value)->toBe('succeeded')->and($audit->completion_tokens)->toBe(240);

    Event::assertDispatched(FileSummaryUpdatedV1::class);
    Event::assertDispatched(
        FileSummaryRecorded::class,
        fn (FileSummaryRecorded $event): bool => $event->status === FileSummaryStatus::Succeeded,
    );
});

it('marks the operation failed with a timeout code and lets the user retry', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    useSummaryProvider(FakeFileSummaryProvider::failing(timedOut: true));
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    $summary = startSummary($user, $target);
    runSummaryJob($summary->id);

    expect($summary->refresh()->status)->toBe(FileSummaryStatus::Failed)
        ->and($summary->error_code)->toBe(FileSummaryError::Timeout)
        ->and($summary->error_code->isRetryable())->toBeTrue()
        ->and(AiRequest::query()->firstOrFail()->status->value)->toBe('timed_out');
});

it('marks the operation failed when the document has no readable text', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    $provider = useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument("   \n ");
    $user = User::factory()->create();

    $summary = startSummary($user, $target);
    runSummaryJob($summary->id);

    expect($summary->refresh()->status)->toBe(FileSummaryStatus::Failed)
        ->and($summary->error_code)->toBe(FileSummaryError::Unreadable)
        ->and($provider->calls)->toBeEmpty();
});

it('counts latency and outcomes for observability', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    runSummaryJob(startSummary($user, $target)->id);

    /** @var InMemoryMetrics $metrics */
    $metrics = app(Metrics::class);

    expect($metrics->value('ai.file_summary.started'))->toBe(1)
        ->and($metrics->value('ai.file_summary.succeeded'))->toBe(1)
        ->and($metrics->value('ai.file_summary.failed'))->toBe(0)
        ->and($metrics->value('ai.file_summary.duration.count'))->toBe(1);

    useSummaryProvider(FakeFileSummaryProvider::failing());
    $second = summaryTarget();
    app(SummarySource::class)->add($second);
    runSummaryJob(startSummary($user, $second)->id);

    expect($metrics->value('ai.file_summary.failed'))->toBe(1);
});

it('does nothing when the job runs twice for the same operation', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    $provider = useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    $summary = startSummary($user, $target);
    runSummaryJob($summary->id);
    runSummaryJob($summary->id);

    expect($provider->calls)->toHaveCount(1)
        ->and($summary->refresh()->status)->toBe(FileSummaryStatus::Succeeded);
});

it('keeps the draft private until the requester publishes it', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();

    $summary = startSummary($user, $target);
    runSummaryJob($summary->id);

    /** @var FakeSummaryPublisher $publisher */
    $publisher = app(SummaryPublisher::class);
    expect($publisher->published)->toBeEmpty();

    $published = app(PublishFileSummaryHandler::class)->handle(new PublishFileSummaryCommand(
        userId: (string) $user->getKey(),
        summaryId: $summary->id,
    ));

    expect($publisher->published)->toHaveCount(1)
        ->and($publisher->published[0]['author_id'])->toBe((string) $user->getKey())
        ->and($publisher->published[0]['room_id'])->toBe($target->roomId)
        ->and($publisher->published[0]['reply_to_id'])->toBe($target->messageId)
        // Вступление стоит перед пересказом (spec: short lead-in).
        ->and($publisher->published[0]['body'])->toStartWith('Вот что:')
        ->and($published->status)->toBe(FileSummaryStatus::Published)
        ->and($published->publishedMessageId)->not->toBeNull();
});

it('refuses to publish a draft that is not ready, already published or foreign', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    useSummaryProvider(new FakeFileSummaryProvider);
    [, $target] = sourceWithDocument();
    $user = User::factory()->create();
    $stranger = User::factory()->create();

    $summary = startSummary($user, $target);

    // Ещё не готов.
    expect(fn () => app(PublishFileSummaryHandler::class)->handle(new PublishFileSummaryCommand(
        userId: (string) $user->getKey(),
        summaryId: $summary->id,
    )))->toThrow(SummaryNotAvailable::class);

    runSummaryJob($summary->id);

    // Чужая операция не существует для постороннего.
    expect(fn () => app(PublishFileSummaryHandler::class)->handle(new PublishFileSummaryCommand(
        userId: (string) $stranger->getKey(),
        summaryId: $summary->id,
    )))->toThrow(ModelNotFoundException::class);

    app(PublishFileSummaryHandler::class)->handle(new PublishFileSummaryCommand(
        userId: (string) $user->getKey(),
        summaryId: $summary->id,
    ));

    // Повторная публикация не удваивает сообщение в комнате.
    expect(fn () => app(PublishFileSummaryHandler::class)->handle(new PublishFileSummaryCommand(
        userId: (string) $user->getKey(),
        summaryId: $summary->id,
    )))->toThrow(SummaryNotAvailable::class);

    expect(app(SummaryPublisher::class)->published)->toHaveCount(1);
});

it('keeps the document text and the summary out of the audit trail', function (): void {
    config()->set('ai.file_summary.job.tries', 1);
    useSummaryProvider(new FakeFileSummaryProvider(summary: 'Секретный пересказ договора'));
    [, $target] = sourceWithDocument('Совершенно секретный текст документа.');
    $user = User::factory()->create();

    runSummaryJob(startSummary($user, $target)->id);

    $audit = json_encode(AiRequest::query()->firstOrFail()->toArray(), JSON_UNESCAPED_UNICODE);

    expect($audit)->not->toContain('Совершенно секретный')->not->toContain('Секретный пересказ');
});

it('writes no document or summary text into the log when a job dies', function (): void {
    Log::spy();
    useSummaryProvider(new FakeFileSummaryProvider(summary: 'Секретный пересказ договора'));
    [, $target] = sourceWithDocument('Совершенно секретный текст документа.');
    $user = User::factory()->create();

    $summary = startSummary($user, $target);

    (new SummarizeFileJob($summary->id))->failed(ProviderUnavailable::timeout());

    expect($summary->refresh()->status)->toBe(FileSummaryStatus::Failed)
        ->and($summary->error_code)->toBe(FileSummaryError::Timeout);

    Log::shouldHaveReceived('warning')->withArgs(function (string $message, array $context): bool {
        $line = $message.' '.json_encode($context, JSON_UNESCAPED_UNICODE);

        // В журнал уходит код категории и класс ошибки — и ничего больше.
        return $message === 'ai.file_summary.failed'
            && ! str_contains($line, 'Совершенно секретный')
            && ! str_contains($line, 'Секретный пересказ')
            && ! str_contains($line, 'dogovor');
    })->once();
});

/** Операция в состоянии «в очереди»: задание запускается тестом вручную. */
function startSummary(User $user, SummaryTarget $target): AiFileSummary
{
    Bus::fake();

    $result = app(SummarizeFileHandler::class)->handle(new SummarizeFileCommand(
        userId: (string) $user->getKey(),
        messageId: $target->messageId,
        body: '@ai перескажи',
    ));

    return AiFileSummary::query()->findOrFail($result['summary']->id);
}

/** Прямой запуск задания: очередь в тестах не нужна, поведение то же. */
function runSummaryJob(string $summaryId): void
{
    app()->call([new SummarizeFileJob($summaryId), 'handle']);
}
