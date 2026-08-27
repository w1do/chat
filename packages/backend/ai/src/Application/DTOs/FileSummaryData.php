<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\DTOs;

use Vendor\Ai\Domain\Enums\FileSummaryError;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Domain\ValueObjects\SummaryTarget;

/** Состояние операции пересказа для представлений: одна форма у POST и GET. */
final readonly class FileSummaryData
{
    public function __construct(
        public string $id,
        public FileSummaryStatus $status,
        public SummaryTarget $target,
        /** Черновик; null, пока пересказ не готов. */
        public ?string $summary,
        public ?FileSummaryError $errorCode,
        public ?string $publishedMessageId,
        public string $createdAt,
    ) {}

    public static function fromModel(AiFileSummary $summary): self
    {
        return new self(
            id: $summary->id,
            status: $summary->status,
            target: $summary->target(),
            summary: $summary->summary,
            errorCode: $summary->error_code,
            publishedMessageId: $summary->published_message_id,
            createdAt: (string) $summary->created_at?->toIso8601ZuluString(),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'room_id' => $this->target->roomId,
            'message_id' => $this->target->messageId,
            'file' => $this->target->toArray(),
            'summary' => $this->summary,
            'error_code' => $this->errorCode?->value,
            'published_message_id' => $this->publishedMessageId,
            'created_at' => $this->createdAt,
        ];
    }
}
