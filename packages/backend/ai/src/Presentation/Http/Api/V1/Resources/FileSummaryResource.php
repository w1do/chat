<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Ai\Application\DTOs\FileSummaryData;

/**
 * Состояние операции для автора запроса. Черновик отдаётся только ему —
 * запрос чужой операции до этого места не доходит (Query-обработчик).
 *
 * @property FileSummaryData $resource
 */
final class FileSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->resource->toArray() + [
            // Вступление перед пересказом: тем же текстом он уйдёт в комнату.
            'lead_in' => (string) config('ai.file_summary.lead_in', ''),
        ];
    }
}
