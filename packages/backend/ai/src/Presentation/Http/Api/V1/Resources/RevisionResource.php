<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Ai\Application\DTOs\RevisionData;

/** @property RevisionData $resource */
final class RevisionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'request_id' => $this->resource->requestId,
            'operation' => $this->resource->operation,
            'original' => $this->resource->original,
            'suggestion' => $this->resource->suggestion,
            'provider' => $this->resource->provider,
            'model' => $this->resource->model,
        ];
    }
}
