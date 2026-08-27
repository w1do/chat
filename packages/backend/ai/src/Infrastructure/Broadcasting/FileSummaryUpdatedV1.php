<?php

declare(strict_types=1);

namespace Vendor\Ai\Infrastructure\Broadcasting;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Models\AiFileSummary;

/**
 * Ход и результат пересказа — только автору запроса, на его приватный канал.
 * Сам черновик событием не передаётся: клиент читает его отдельным GET, и
 * приватный текст не размножается по транспортам (spec: privacy).
 */
final class FileSummaryUpdatedV1 implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    public function __construct(
        public readonly string $userId,
        public readonly string $roomId,
        public readonly string $summaryId,
        public readonly FileSummaryStatus $status,
        public readonly ?string $errorCode,
        public readonly string $occurredAt,
    ) {}

    public static function forSummary(AiFileSummary $summary): self
    {
        return new self(
            userId: $summary->user_id,
            roomId: $summary->room_id,
            summaryId: $summary->id,
            status: $summary->status,
            errorCode: $summary->error_code?->value,
            occurredAt: now()->toIso8601ZuluString(),
        );
    }

    public function broadcastAs(): string
    {
        return 'ai.file_summary.updated.v1';
    }

    /** @return list<Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->userId)];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event' => $this->broadcastAs(),
            'version' => 1,
            'room_id' => $this->roomId,
            'occurred_at' => $this->occurredAt,
            'data' => [
                'id' => $this->summaryId,
                'status' => $this->status->value,
                'progress' => $this->status->progress(),
                'error_code' => $this->errorCode,
            ],
        ];
    }
}
