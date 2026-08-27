<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Providers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Throwable;
use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\ValueObjects\DocumentText;
use Vendor\Ai\Domain\ValueObjects\FileSummaryResult;
use Vendor\Ai\Domain\ValueObjects\TokenUsage;
use Vendor\Ai\Infrastructure\Prompts\PromptLibrary;

/**
 * Пересказ документа через OpenAI-совместимый API Polza. Наружу уходит
 * извлечённый текст документа и системный промпт — ни истории комнаты, ни
 * имени файла, ни данных отправителя (CLAUDE.md §9).
 */
final readonly class PolzaFileSummaryProvider implements FileSummaryProvider
{
    public function __construct(
        private HttpFactory $http,
        private PromptLibrary $prompts,
        private string $baseUrl,
        private string $apiKey,
        private string $model,
        private int $timeoutSeconds,
    ) {}

    public function summarize(DocumentText $document, string $locale, int $minLength, int $maxLength): FileSummaryResult
    {
        try {
            $response = $this->http
                ->withToken($this->apiKey)
                ->timeout($this->timeoutSeconds)
                ->connectTimeout($this->timeoutSeconds)
                ->acceptJson()
                ->post(rtrim($this->baseUrl, '/').'/chat/completions', [
                    'model' => $this->model,
                    'temperature' => 0.2,
                    'messages' => [
                        ['role' => 'system', 'content' => $this->prompts->summaryPrompt($locale, $minLength, $maxLength)],
                        ['role' => 'user', 'content' => $document->value],
                    ],
                ]);
        } catch (ConnectionException) {
            throw ProviderUnavailable::timeout();
        } catch (Throwable) {
            throw new ProviderUnavailable('AI provider request failed.');
        }

        if ($response->status() === 408 || $response->status() === 504) {
            throw ProviderUnavailable::timeout();
        }

        if (! $response->successful()) {
            // Тело ответа может содержать эхо документа — наружу его не выносим.
            throw new ProviderUnavailable("AI provider returned status {$response->status()}.");
        }

        $summary = trim((string) $response->json('choices.0.message.content', ''));

        if ($summary === '') {
            throw new ProviderUnavailable('AI provider returned an empty summary.');
        }

        return new FileSummaryResult(
            summary: $summary,
            model: (string) $response->json('model', $this->model),
            usage: new TokenUsage(
                promptTokens: (int) $response->json('usage.prompt_tokens', 0),
                completionTokens: (int) $response->json('usage.completion_tokens', 0),
            ),
        );
    }

    public function name(): string
    {
        return 'polza';
    }
}
