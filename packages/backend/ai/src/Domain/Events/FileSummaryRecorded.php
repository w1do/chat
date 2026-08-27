<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Events;

use Vendor\Ai\Domain\Enums\FileSummaryStatus;

/**
 * Операция пересказа сменила состояние. Событие несёт только безопасные
 * метаданные: ни документа, ни пересказа — приложение кладёт их в аудит.
 */
final readonly class FileSummaryRecorded
{
    public function __construct(
        public string $summaryId,
        public string $userId,
        public string $roomId,
        public string $messageId,
        public FileSummaryStatus $status,
        public string $provider,
        public string $mimeType,
        public int $fileSize,
        public ?string $model = null,
        public ?string $errorCode = null,
        public int $promptTokens = 0,
        public int $completionTokens = 0,
        public int $durationMs = 0,
    ) {}
}
