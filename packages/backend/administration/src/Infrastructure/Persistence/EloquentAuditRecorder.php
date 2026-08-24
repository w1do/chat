<?php

declare(strict_types=1);

namespace Vendor\Administration\Infrastructure\Persistence;

use Illuminate\Support\Carbon;
use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Administration\Domain\Models\AuditLog;
use Vendor\Administration\Infrastructure\Redaction\ContextRedactor;

final readonly class EloquentAuditRecorder implements AuditRecorder
{
    public function __construct(private ContextRedactor $redactor) {}

    public function record(
        string $action,
        ?string $actorId = null,
        ?string $actorLabel = null,
        ?string $subjectType = null,
        ?string $subjectId = null,
        array $context = [],
    ): void {
        AuditLog::query()->create([
            'actor_id' => $actorId,
            'actor_label' => $actorLabel,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'context' => $this->redactor->redact($context),
            'created_at' => Carbon::now(),
        ]);
    }
}
