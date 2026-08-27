<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use Vendor\Ai\Domain\ValueObjects\DocumentText;
use Vendor\Ai\Domain\ValueObjects\FileSummaryResult;

/**
 * Порт наружу для пересказа документа. Отдельный от TextRevisionProvider:
 * у файла свои пределы, своя валидация и свой промпт (design 2).
 */
interface FileSummaryProvider
{
    /**
     * @param  string  $locale  язык ответа; поддержку проверяет вызывающий
     *
     * @throws ProviderUnavailable когда поставщик недоступен или превысил таймаут
     */
    public function summarize(DocumentText $document, string $locale, int $minLength, int $maxLength): FileSummaryResult;

    public function name(): string;
}
