<?php

declare(strict_types=1);

namespace Vendor\Ai\Testing;

use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\ValueObjects\DraftText;
use Vendor\Ai\Domain\ValueObjects\RevisionResult;
use Vendor\Ai\Domain\ValueObjects\TokenUsage;

/**
 * Поставщик для тестов и CI: обычный прогон не ходит в настоящий AI
 * (CLAUDE.md §13). Публичный, потому что им пользуются тесты приложения.
 */
final class FakeTextRevisionProvider implements TextRevisionProvider
{
    /** @var list<array{draft: string, operation: string, tone: ?string, instruction: ?string}> */
    public array $calls = [];

    public function __construct(
        private ?ProviderUnavailable $failure = null,
        private string $suggestion = 'Улучшенный текст',
    ) {}

    public static function failing(bool $timedOut = false): self
    {
        return new self($timedOut
            ? ProviderUnavailable::timeout()
            : new ProviderUnavailable('AI provider request failed.'));
    }

    public function revise(
        DraftText $draft,
        RevisionOperation $operation,
        ?string $tone = null,
        ?string $instruction = null,
    ): RevisionResult {
        $this->calls[] = [
            'draft' => $draft->value,
            'operation' => $operation->value,
            'tone' => $tone,
            'instruction' => $instruction,
        ];

        if ($this->failure !== null) {
            throw $this->failure;
        }

        return new RevisionResult(
            suggestion: $this->suggestion,
            model: 'fake/model',
            usage: new TokenUsage(promptTokens: 12, completionTokens: 8),
        );
    }

    public function name(): string
    {
        return 'fake';
    }
}
