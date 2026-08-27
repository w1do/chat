<?php

declare(strict_types=1);

namespace App\Administration;

use Vendor\Administration\Domain\Contracts\AuditRecorder;
use Vendor\Ai\Domain\Events\FileSummaryRecorded;
use Vendor\Ai\Domain\Events\RevisionRecorded;

/**
 * AI-обращение → журнал аудита. В контекст идут только метаданные: ни
 * черновика, ни предложения (CLAUDE.md §9).
 */
final readonly class RecordsAiAudit
{
    public function __construct(private AuditRecorder $audit) {}

    public function onRevisionRecorded(RevisionRecorded $event): void
    {
        $this->audit->record(
            action: 'ai.revision.'.$event->status->value,
            actorId: $event->userId,
            subjectType: 'ai_request',
            subjectId: $event->requestId,
            context: [
                'operation' => $event->operation->value,
                'provider' => $event->provider,
                'model' => $event->model,
                'prompt_tokens' => $event->promptTokens,
                'completion_tokens' => $event->completionTokens,
                'duration_ms' => $event->durationMs,
            ],
        );
    }

    /**
     * Пересказ документа → журнал аудита. В контекст идут комната, сообщение
     * и безопасные метаданные файла: ни его текста, ни пересказа (CLAUDE.md §9).
     */
    public function onFileSummaryRecorded(FileSummaryRecorded $event): void
    {
        $this->audit->record(
            action: 'ai.file_summary.'.$event->status->value,
            actorId: $event->userId,
            subjectType: 'ai_file_summary',
            subjectId: $event->summaryId,
            context: [
                'room_id' => $event->roomId,
                'message_id' => $event->messageId,
                'provider' => $event->provider,
                'model' => $event->model,
                'mime_type' => $event->mimeType,
                'file_size' => $event->fileSize,
                'error_code' => $event->errorCode,
                'prompt_tokens' => $event->promptTokens,
                'completion_tokens' => $event->completionTokens,
                'duration_ms' => $event->durationMs,
            ],
        );
    }
}
