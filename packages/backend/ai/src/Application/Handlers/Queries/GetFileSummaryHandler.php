<?php

declare(strict_types=1);

namespace Vendor\Ai\Application\Handlers\Queries;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Vendor\Ai\Application\DTOs\FileSummaryData;
use Vendor\Ai\Application\Queries\GetFileSummaryQuery;
use Vendor\Ai\Domain\Models\AiFileSummary;

/**
 * Ресинхронизация после переподключения: состояние операции и черновик
 * читаются по HTTP, не только из real-time события (spec: HTTP resync).
 */
final readonly class GetFileSummaryHandler
{
    /** @throws ModelNotFoundException когда операции нет или она чужая */
    public function handle(GetFileSummaryQuery $query): FileSummaryData
    {
        /** @var ?AiFileSummary $summary */
        $summary = AiFileSummary::query()->whereKey($query->summaryId)->first();

        // Черновик принадлежит автору запроса: постороннему его нет.
        if ($summary === null || ! $summary->isOwnedBy($query->userId)) {
            throw (new ModelNotFoundException)->setModel(AiFileSummary::class, [$query->summaryId]);
        }

        return FileSummaryData::fromModel($summary);
    }
}
