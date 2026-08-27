<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Providers;

use Vendor\Ai\Domain\Contracts\FileSummaryProvider;
use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\ValueObjects\DocumentText;
use Vendor\Ai\Domain\ValueObjects\FileSummaryResult;

/**
 * Поставщик не настроен: пересказ не делается, чат работает как обычно.
 * Молчаливая заглушка вместо падения приложения при пустом ключе.
 */
final readonly class NullFileSummaryProvider implements FileSummaryProvider
{
    public function summarize(DocumentText $document, string $locale, int $minLength, int $maxLength): FileSummaryResult
    {
        throw new ProviderUnavailable('AI provider is not configured.');
    }

    public function name(): string
    {
        return 'null';
    }
}
