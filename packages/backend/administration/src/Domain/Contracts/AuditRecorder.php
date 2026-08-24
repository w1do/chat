<?php

declare(strict_types=1);

namespace Vendor\Administration\Domain\Contracts;

/** Журнал значимых действий. Приложение может заменить реализацию (§4.1). */
interface AuditRecorder
{
    /** @param array<string, mixed> $context безопасные метаданные; секреты и приватный текст отбрасываются */
    public function record(
        string $action,
        ?string $actorId = null,
        ?string $actorLabel = null,
        ?string $subjectType = null,
        ?string $subjectId = null,
        array $context = [],
    ): void;
}
