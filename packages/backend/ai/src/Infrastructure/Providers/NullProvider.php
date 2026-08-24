<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Providers;

use Vendor\Ai\Domain\Contracts\ProviderUnavailable;
use Vendor\Ai\Domain\Contracts\TextRevisionProvider;
use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\ValueObjects\DraftText;
use Vendor\Ai\Domain\ValueObjects\RevisionResult;

/** Поставщик по умолчанию: AI не настроен — чат работает, помощник молчит. */
final readonly class NullProvider implements TextRevisionProvider
{
    public function revise(
        DraftText $draft,
        RevisionOperation $operation,
        ?string $tone = null,
        ?string $instruction = null,
    ): RevisionResult {
        throw new ProviderUnavailable('AI provider is not configured.');
    }

    public function name(): string
    {
        return 'null';
    }
}
