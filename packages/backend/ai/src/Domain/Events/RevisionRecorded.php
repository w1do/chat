<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Events;

use Vendor\Ai\Domain\Enums\RequestStatus;
use Vendor\Ai\Domain\Enums\RevisionOperation;

/**
 * Обращение к помощнику состоялось. Событие несёт только безопасные
 * метаданные — ни черновика, ни предложения, ни ключей: приложение
 * пересылает их в журнал аудита (STRUCTURE.md §2).
 */
final readonly class RevisionRecorded
{
    public function __construct(
        public string $requestId,
        public string $userId,
        public RevisionOperation $operation,
        public string $provider,
        public RequestStatus $status,
        public ?string $model = null,
        public int $promptTokens = 0,
        public int $completionTokens = 0,
        public int $durationMs = 0,
    ) {}
}
