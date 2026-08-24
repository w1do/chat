<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\DTOs;

use Vendor\Administration\Domain\Models\AuditLog;

final readonly class AuditEntryData
{
    /** @param array<string, mixed> $context */
    public function __construct(
        public string $id,
        public ?string $actorId,
        public ?string $actorLabel,
        public string $action,
        public ?string $subjectType,
        public ?string $subjectId,
        public array $context,
        public string $createdAt,
    ) {}

    public static function fromModel(AuditLog $log): self
    {
        return new self(
            id: $log->id,
            actorId: $log->actor_id,
            actorLabel: $log->actor_label,
            action: $log->action,
            subjectType: $log->subject_type,
            subjectId: $log->subject_id,
            context: $log->context ?? [],
            createdAt: $log->created_at->toIso8601String(),
        );
    }
}
