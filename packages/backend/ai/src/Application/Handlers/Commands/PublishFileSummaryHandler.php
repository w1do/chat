<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Handlers\Commands;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Vendor\Ai\Application\Commands\PublishFileSummaryCommand;
use Vendor\Ai\Application\DTOs\FileSummaryData;
use Vendor\Ai\Application\SummaryNotAvailable;
use Vendor\Ai\Domain\Contracts\SummaryPublisher;
use Vendor\Ai\Domain\Contracts\SummaryPublishFailed;
use Vendor\Ai\Domain\Enums\FileSummaryStatus;
use Vendor\Ai\Domain\Events\FileSummaryRecorded;
use Vendor\Ai\Domain\Models\AiFileSummary;
use Vendor\Ai\Infrastructure\Broadcasting\FileSummaryUpdatedV1;

/**
 * Публикация подтверждённого черновика. До этого шага пересказ виден только
 * автору запроса; сообщение в комнате — обычное и от его имени (spec).
 */
final readonly class PublishFileSummaryHandler
{
    public function __construct(
        private SummaryPublisher $publisher,
        private Repository $config,
        private Dispatcher $events,
    ) {}

    /**
     * @throws ModelNotFoundException когда операции нет или она чужая
     * @throws SummaryNotAvailable когда черновик не готов, просрочен или уже опубликован
     * @throws SummaryPublishFailed когда комната больше не принимает сообщения
     */
    public function handle(PublishFileSummaryCommand $command): FileSummaryData
    {
        /** @var ?AiFileSummary $summary */
        $summary = AiFileSummary::query()->whereKey($command->summaryId)->first();

        // Чужая операция для человека не существует — как и несуществующая.
        if ($summary === null || ! $summary->isOwnedBy($command->userId)) {
            throw (new ModelNotFoundException)->setModel(AiFileSummary::class, [$command->summaryId]);
        }

        if (! $summary->status->isPublishable() || $summary->summary === null) {
            throw new SummaryNotAvailable('Summary draft is not ready for publishing.');
        }

        if ($this->isExpired($summary)) {
            throw new SummaryNotAvailable('Summary draft has expired.');
        }

        $messageId = $this->publisher->publish(
            roomId: $summary->room_id,
            authorId: $summary->user_id,
            body: self::body($summary, (string) $this->config->get('ai.file_summary.lead_in', '')),
            replyToId: $summary->message_id,
        );

        $summary->update([
            'status' => FileSummaryStatus::Published,
            'published_message_id' => $messageId,
        ]);

        $this->events->dispatch(new FileSummaryRecorded(
            summaryId: $summary->id,
            userId: $summary->user_id,
            roomId: $summary->room_id,
            messageId: $summary->message_id,
            status: FileSummaryStatus::Published,
            provider: $summary->provider,
            mimeType: $summary->mime_type,
            fileSize: $summary->file_size,
            model: $summary->model,
        ));

        $this->events->dispatch(FileSummaryUpdatedV1::forSummary($summary));

        return FileSummaryData::fromModel($summary);
    }

    /** Черновик живёт ограниченное время: старый пересказ уже не про эту беседу. */
    private function isExpired(AiFileSummary $summary): bool
    {
        $hours = (int) $this->config->get('ai.file_summary.draft_ttl_hours', 24);

        return $hours > 0
            && $summary->created_at !== null
            && $summary->created_at->lt(Carbon::now()->subHours($hours));
    }

    /** Вступление отделено от пересказа: в комнату уходит тот же текст, что видел человек. */
    private static function body(AiFileSummary $summary, string $leadIn): string
    {
        return trim($leadIn) === '' ? (string) $summary->summary : trim($leadIn)."\n\n".$summary->summary;
    }
}
