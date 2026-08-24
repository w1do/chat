<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\ReactionData;

/** @property ReactionData $resource */
final class ReactionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'emoji' => $this->resource->emoji,
            'count' => $this->resource->count,
            'reacted_by_me' => $this->resource->reactedByMe,
        ];
    }
}
