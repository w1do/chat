<?php

declare(strict_types=1);

namespace Vendor\Ai\Testing;

use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\ValueObjects\DocumentText;
use Vendor\Ai\Domain\ValueObjects\FileSummaryResult;
use Vendor\Ai\Domain\ValueObjects\TokenUsage;

/**
 * Поставщик пересказа для тестов и CI: обычный прогон не ходит в настоящий
 * AI (CLAUDE.md §13). Публичный — им пользуются и тесты приложения.
 */
final class FakeFileSummaryProvider implements FileSummaryProvider
{
    /** @var list<array{document: string, locale: string, min: int, max: int}> */
    public array $calls = [];

    public function __construct(
        private ?ProviderUnavailable $failure = null,
        private ?string $summary = null,
    ) {}

    public static function failing(bool $timedOut = false): self
    {
        return new self($timedOut
            ? ProviderUnavailable::timeout()
            : new ProviderUnavailable('AI provider request failed.'));
    }

    public function summarize(DocumentText $document, string $locale, int $minLength, int $maxLength): FileSummaryResult
    {
        $this->calls[] = [
            'document' => $document->value,
            'locale' => $locale,
            'min' => $minLength,
            'max' => $maxLength,
        ];

        if ($this->failure !== null) {
            throw $this->failure;
        }

        return new FileSummaryResult(
            summary: $this->summary ?? self::filler($minLength),
            model: 'fake/model',
            usage: new TokenUsage(promptTokens: 800, completionTokens: 240),
        );
    }

    public function name(): string
    {
        return 'fake';
    }

    /** Пересказ ожидаемой длины: окно 500–800 символов проверяется как есть. */
    private static function filler(int $minLength): string
    {
        $sentence = 'В документе описаны условия договора, сроки и суммы платежей. ';

        return trim(str_repeat($sentence, (int) ceil(($minLength + 40) / mb_strlen($sentence))));
    }
}
