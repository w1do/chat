<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Quota;

use Illuminate\Contracts\Config\Repository;
use Vendor\Ai\Domain\Enums\RequestStatus;
use Vendor\Ai\Domain\Models\AiRequest;
use Vendor\Ai\Domain\ValueObjects\TokenUsage;

/**
 * Безопасный аудит: операция, поставщик, модель, статус, расход и длина ввода.
 * Ни промпта, ни ответа, ни ключей (spec: AI use is audited safely).
 */
final readonly class UsageRecorder
{
    public function __construct(private Repository $config) {}

    public function record(
        string $userId,
        string $operation,
        string $provider,
        RequestStatus $status,
        int $inputLength,
        int $durationMs,
        ?string $model = null,
        ?TokenUsage $usage = null,
        ?string $failureReason = null,
    ): AiRequest {
        $usage ??= new TokenUsage;

        return AiRequest::query()->create([
            'user_id' => $userId,
            'operation' => $operation,
            'provider' => $provider,
            'model' => $model,
            'status' => $status,
            'prompt_tokens' => $usage->promptTokens,
            'completion_tokens' => $usage->completionTokens,
            'cost_minor' => $usage->costInMinorUnits(
                (float) $this->config->get('ai.pricing.prompt_per_1k', 0.0),
                (float) $this->config->get('ai.pricing.completion_per_1k', 0.0),
            ),
            'input_length' => $inputLength,
            'duration_ms' => $durationMs,
            // Причина — короткая и безопасная: класс ошибки, не текст запроса.
            'failure_reason' => $failureReason !== null ? mb_substr($failureReason, 0, 255) : null,
        ]);
    }

    /**
     * Заготовка записи для асинхронной операции: строка появляется сразу,
     * расход и итог дописываются, когда поставщик ответит.
     */
    public function start(string $userId, string $operation, string $provider): AiRequest
    {
        return AiRequest::query()->create([
            'user_id' => $userId,
            'operation' => $operation,
            'provider' => $provider,
            'status' => RequestStatus::Pending,
        ]);
    }

    /** Итог асинхронной операции по её записи аудита. */
    public function finish(
        string $requestId,
        RequestStatus $status,
        int $inputLength,
        int $durationMs,
        ?string $model = null,
        ?TokenUsage $usage = null,
        ?string $failureReason = null,
    ): void {
        $usage ??= new TokenUsage;

        AiRequest::query()->whereKey($requestId)->update([
            'status' => $status->value,
            'model' => $model,
            'prompt_tokens' => $usage->promptTokens,
            'completion_tokens' => $usage->completionTokens,
            'cost_minor' => $usage->costInMinorUnits(
                (float) $this->config->get('ai.pricing.prompt_per_1k', 0.0),
                (float) $this->config->get('ai.pricing.completion_per_1k', 0.0),
            ),
            'input_length' => $inputLength,
            'duration_ms' => $durationMs,
            'failure_reason' => $failureReason !== null ? mb_substr($failureReason, 0, 255) : null,
            'updated_at' => now(),
        ]);
    }
}
