<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\Metrics;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\SummarySource;
use Vendor\Ai\Domain\Contracts\TextExtractor;
use Vendor\Ai\Domain\Contracts\UnreadableDocument;
use Vendor\Ai\Domain\Enums\FileSummaryError;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Enums\RequestStatus;
use Vendor\Ai\Domain\Events\FileSummaryRecorded;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\ValueObjects\DocumentText;
use Vendor\Ai\Domain\ValueObjects\SummaryText;
use Vendor\Ai\Infrastructure\Broadcasting\FileSummaryUpdatedV1;
use Vendor\Ai\Infrastructure\Quota\UsageRecorder;
use Vendor\Ai\Infrastructure\Resilience\CircuitBreaker;

/**
 * Обращение к поставщику вынесено в очередь: HTTP-ответ не ждёт внешнего
 * сервиса, а повтор задания безопасен — операция уже записана и переход в
 * конечное состояние выполняется один раз (design 4).
 */
final class SummarizeFileJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly string $summaryId)
    {
        $this->onQueue((string) config('ai.file_summary.queue', 'ai'));
    }

    public function tries(): int
    {
        return max(1, (int) config('ai.file_summary.job.tries', 2));
    }

    public function timeout(): int
    {
        return (int) config('ai.file_summary.job.timeout', 90);
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return config('ai.file_summary.job.backoff', [15, 60]);
    }

    /** Одна операция — одно задание: повторная отправка не удваивает расход. */
    public function uniqueId(): string
    {
        return $this->summaryId;
    }

    public function handle(
        SummarySource $source,
        TextExtractor $extractor,
        FileSummaryProvider $provider,
        CircuitBreaker $breaker,
        Repository $config,
        Dispatcher $events,
        Metrics $metrics,
        UsageRecorder $recorder,
    ): void {
        /** @var ?AiFileSummary $summary */
        $summary = AiFileSummary::query()->whereKey($this->summaryId)->first();

        // Операции нет или она уже завершилась — повтор ничего не меняет.
        if ($summary === null || $summary->status !== FileSummaryStatus::Pending) {
            return;
        }

        $settings = (array) $config->get('ai.file_summary', []);
        $startedAt = microtime(true);

        $this->moveTo($summary, FileSummaryStatus::Processing, $events);
        $metrics->increment('ai.file_summary.started');

        if (! $config->get('ai.enabled', false)) {
            $this->fail($summary, FileSummaryError::Disabled, 0, $startedAt, $events, $metrics, $recorder);

            return;
        }

        try {
            $document = DocumentText::fromExtracted(
                $extractor->extract($source->read($summary->attachment_id), $summary->mime_type, $summary->target()->extension()),
                (int) ($settings['max_document_characters'] ?? 24000),
            );
        } catch (UnreadableDocument|\InvalidArgumentException) {
            $this->fail($summary, FileSummaryError::Unreadable, 0, $startedAt, $events, $metrics, $recorder);

            return;
        }

        $min = (int) ($settings['min_length'] ?? 500);
        $max = (int) ($settings['max_length'] ?? 800);

        try {
            $result = $breaker->call(
                $provider->name(),
                fn () => $provider->summarize($document, $summary->locale, $min, $max),
            );
        } catch (ProviderUnavailable $exception) {
            $error = $exception->timedOut ? FileSummaryError::Timeout : FileSummaryError::Unavailable;

            // Пока попытки не исчерпаны — отдаём задание очереди с backoff;
            // код отказа сохраняем, чтобы failed() не гадал о причине.
            if ($this->retryRemains()) {
                $summary->update(['status' => FileSummaryStatus::Pending, 'error_code' => $error]);

                throw $exception;
            }

            $this->fail($summary, $error, $document->length(), $startedAt, $events, $metrics, $recorder);

            return;
        }

        $summary->update([
            'status' => FileSummaryStatus::Succeeded,
            'summary' => SummaryText::clamp($result->summary, $min, $max)->value,
            'error_code' => null,
            'model' => $result->model,
            'prompt_tokens' => $result->usage->promptTokens,
            'completion_tokens' => $result->usage->completionTokens,
            'cost_minor' => $result->usage->costInMinorUnits(
                (float) $config->get('ai.pricing.prompt_per_1k', 0.0),
                (float) $config->get('ai.pricing.completion_per_1k', 0.0),
            ),
            'duration_ms' => self::elapsedMs($startedAt),
        ]);

        if ($summary->ai_request_id !== null) {
            $recorder->finish(
                requestId: $summary->ai_request_id,
                status: RequestStatus::Succeeded,
                inputLength: $document->length(),
                durationMs: $summary->duration_ms,
                model: $result->model,
                usage: $result->usage,
            );
        }

        $metrics->increment('ai.file_summary.succeeded');
        $metrics->observeMilliseconds('ai.file_summary.duration', self::elapsedMs($startedAt));

        $this->record($summary, $events);
        $events->dispatch(FileSummaryUpdatedV1::forSummary($summary));
    }

    /**
     * Последняя попытка сорвалась жёстко (таймаут воркера, падение процесса):
     * операция не должна остаться «в работе» навсегда. В журнал идёт класс
     * ошибки — ни документа, ни пересказа (spec: privacy).
     */
    public function failed(Throwable $exception): void
    {
        /** @var ?AiFileSummary $summary */
        $summary = AiFileSummary::query()->whereKey($this->summaryId)->first();

        if ($summary === null || $summary->status->isFinal() || $summary->status->isPublishable()) {
            return;
        }

        $error = $summary->error_code ?? ($exception instanceof ProviderUnavailable && $exception->timedOut
            ? FileSummaryError::Timeout
            : FileSummaryError::Unavailable);

        $summary->update(['status' => FileSummaryStatus::Failed, 'error_code' => $error]);

        if ($summary->ai_request_id !== null) {
            app(UsageRecorder::class)->finish(
                requestId: $summary->ai_request_id,
                status: $error === FileSummaryError::Timeout ? RequestStatus::TimedOut : RequestStatus::Failed,
                inputLength: 0,
                durationMs: $summary->duration_ms,
                failureReason: $error->value,
            );
        }

        Log::warning('ai.file_summary.failed', [
            'summary_id' => $summary->id,
            'error_code' => $error->value,
            'reason' => $exception::class,
        ]);

        $events = app(Dispatcher::class);
        $this->record($summary, $events, $error);
        $events->dispatch(FileSummaryUpdatedV1::forSummary($summary));
        app(Metrics::class)->increment('ai.file_summary.failed');
    }

    private function retryRemains(): bool
    {
        // Вне очереди (прямой вызов в тесте) повторять нечем — падаем сразу.
        return $this->job !== null && $this->attempts() < $this->tries();
    }

    private function moveTo(AiFileSummary $summary, FileSummaryStatus $status, Dispatcher $events): void
    {
        $summary->update(['status' => $status]);
        $events->dispatch(FileSummaryUpdatedV1::forSummary($summary));
    }

    private function fail(
        AiFileSummary $summary,
        FileSummaryError $error,
        int $inputLength,
        float $startedAt,
        Dispatcher $events,
        Metrics $metrics,
        UsageRecorder $recorder,
    ): void {
        $summary->update([
            'status' => FileSummaryStatus::Failed,
            'error_code' => $error,
            'duration_ms' => self::elapsedMs($startedAt),
        ]);

        if ($summary->ai_request_id !== null) {
            $recorder->finish(
                requestId: $summary->ai_request_id,
                status: $error === FileSummaryError::Timeout ? RequestStatus::TimedOut : RequestStatus::Failed,
                inputLength: $inputLength,
                durationMs: $summary->duration_ms,
                // Только код категории: ни документа, ни ответа поставщика.
                failureReason: $error->value,
            );
        }

        $metrics->increment('ai.file_summary.failed');
        $this->record($summary, $events, $error);
        $events->dispatch(FileSummaryUpdatedV1::forSummary($summary));
    }

    private function record(AiFileSummary $summary, Dispatcher $events, ?FileSummaryError $error = null): void
    {
        $events->dispatch(new FileSummaryRecorded(
            summaryId: $summary->id,
            userId: $summary->user_id,
            roomId: $summary->room_id,
            messageId: $summary->message_id,
            status: $summary->status,
            provider: $summary->provider,
            mimeType: $summary->mime_type,
            fileSize: $summary->file_size,
            model: $summary->model,
            errorCode: ($error ?? $summary->error_code)?->value,
            promptTokens: $summary->prompt_tokens,
            completionTokens: $summary->completion_tokens,
            durationMs: $summary->duration_ms,
        ));
    }

    private static function elapsedMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }
}
