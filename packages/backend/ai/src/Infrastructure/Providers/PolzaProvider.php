<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Providers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Throwable;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\ValueObjects\DraftText;
use Vendor\Ai\Domain\ValueObjects\RevisionResult;
use Vendor\Ai\Domain\ValueObjects\TokenUsage;
use Vendor\Ai\Infrastructure\Prompts\PromptLibrary;

/**
 * Polza AI — OpenAI-совместимый API (`/chat/completions`, Bearer-ключ).
 * Наружу отдаёт только предложение и расход токенов; ключ и тело запроса
 * не попадают ни в исключения, ни в логи.
 */
final readonly class PolzaProvider implements TextRevisionProvider
{
    public function __construct(
        private HttpFactory $http,
        private PromptLibrary $prompts,
        private string $baseUrl,
        private string $apiKey,
        private string $model,
        private int $timeoutSeconds,
    ) {}

    public function revise(
        DraftText $draft,
        RevisionOperation $operation,
        ?string $tone = null,
        ?string $instruction = null,
    ): RevisionResult {
        try {
            $response = $this->http
                ->withToken($this->apiKey)
                ->timeout($this->timeoutSeconds)
                ->connectTimeout($this->timeoutSeconds)
                ->acceptJson()
                ->post(rtrim($this->baseUrl, '/').'/chat/completions', [
                    'model' => $this->model,
                    'temperature' => 0.3,
                    'messages' => [
                        ['role' => 'system', 'content' => $this->prompts->systemPrompt($operation, $tone, $instruction)],
                        // Только сам черновик: история комнаты не отправляется.
                        ['role' => 'user', 'content' => $draft->value],
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
            // Тело ответа может содержать эхо запроса — наружу его не выносим.
            throw new ProviderUnavailable("AI provider returned status {$response->status()}.");
        }

        $suggestion = trim((string) $response->json('choices.0.message.content', ''));

        if ($suggestion === '') {
            throw new ProviderUnavailable('AI provider returned an empty suggestion.');
        }

        return new RevisionResult(
            suggestion: $suggestion,
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
