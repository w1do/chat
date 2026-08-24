<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Handlers\Commands;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use Vendor\Ai\Application\AiUnavailable;
use Vendor\Ai\Application\Commands\ReviseDraftCommand;
use Vendor\Ai\Application\DTOs\RevisionData;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Enums\RequestStatus;
use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\Events\RevisionRecorded;
use Vendor\Ai\Domain\ValueObjects\DraftText;
use Vendor\Ai\Infrastructure\Quota\QuotaExceeded;
use Vendor\Ai\Infrastructure\Quota\RateLimiter;
use Vendor\Ai\Infrastructure\Quota\UsageRecorder;
use Vendor\Ai\Infrastructure\Resilience\CircuitBreaker;
use Vendor\Ai\Infrastructure\Resilience\RetryPolicy;

/**
 * Единственный use case пакета: предложить исправленный черновик.
 * Результат — предложение, а не публикация (spec: never auto-publish).
 */
final readonly class ReviseDraftHandler
{
    public function __construct(
        private TextRevisionProvider $provider,
        private RateLimiter $limiter,
        private UsageRecorder $recorder,
        private CircuitBreaker $breaker,
        private RetryPolicy $retries,
        private Repository $config,
        private Dispatcher $events,
    ) {}

    /**
     * @throws AiUnavailable когда помощник выключен
     * @throws QuotaExceeded когда исчерпана квота пользователя
     * @throws \InvalidArgumentException когда текст пуст или длиннее лимита
     * @throws ProviderUnavailable когда поставщик недоступен
     */
    public function handle(ReviseDraftCommand $command): RevisionData
    {
        if (! $this->config->get('ai.enabled', false)) {
            throw new AiUnavailable;
        }

        $operation = RevisionOperation::from($command->operation);

        // Квота проверяется до валидации текста и до обращения к поставщику.
        $this->limiter->assertWithinQuota($command->userId);

        // Длина проверяется здесь же: превышение не доходит до поставщика.
        $draft = DraftText::fromUserInput(
            $command->text,
            (int) $this->config->get('ai.limits.max_input_length', 2000),
        );

        $this->limiter->record($command->userId);
        $startedAt = microtime(true);

        try {
            $result = $this->breaker->call(
                $this->provider->name(),
                fn () => $this->retries->run(fn () => $this->provider->revise(
                    $draft,
                    $operation,
                    $command->tone,
                    $command->instruction,
                )),
            );
        } catch (ProviderUnavailable $exception) {
            $failed = $this->recorder->record(
                userId: $command->userId,
                operation: $operation,
                provider: $this->provider->name(),
                status: $exception->timedOut ? RequestStatus::TimedOut : RequestStatus::Failed,
                inputLength: $draft->length(),
                durationMs: $this->elapsedMs($startedAt),
                failureReason: $exception->getMessage(),
            );

            $this->events->dispatch(new RevisionRecorded(
                requestId: $failed->id,
                userId: $command->userId,
                operation: $operation,
                provider: $this->provider->name(),
                status: $failed->status,
                durationMs: $this->elapsedMs($startedAt),
            ));

            throw $exception;
        }

        $record = $this->recorder->record(
            userId: $command->userId,
            operation: $operation,
            provider: $this->provider->name(),
            status: RequestStatus::Succeeded,
            inputLength: $draft->length(),
            durationMs: $this->elapsedMs($startedAt),
            model: $result->model,
            usage: $result->usage,
        );

        $this->events->dispatch(new RevisionRecorded(
            requestId: $record->id,
            userId: $command->userId,
            operation: $operation,
            provider: $this->provider->name(),
            status: RequestStatus::Succeeded,
            model: $result->model,
            promptTokens: $result->usage->promptTokens,
            completionTokens: $result->usage->completionTokens,
            durationMs: $this->elapsedMs($startedAt),
        ));

        return new RevisionData(
            requestId: $record->id,
            operation: $operation->value,
            original: $draft->value,
            suggestion: $result->suggestion,
            provider: $this->provider->name(),
            model: $result->model,
        );
    }

    private function elapsedMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }
}
