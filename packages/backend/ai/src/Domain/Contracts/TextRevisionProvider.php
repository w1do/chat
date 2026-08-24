<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\ValueObjects\DraftText;
use Vendor\Ai\Domain\ValueObjects\RevisionResult;

/**
 * Единственный порт наружу (STRUCTURE.md §3). Домен не знает ни про HTTP,
 * ни про конкретного поставщика.
 */
interface TextRevisionProvider
{
    /**
     * @throws ProviderUnavailable когда поставщик недоступен или превысил таймаут
     */
    public function revise(
        DraftText $draft,
        RevisionOperation $operation,
        ?string $tone = null,
        ?string $instruction = null,
    ): RevisionResult;

    public function name(): string;
}
