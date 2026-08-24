<?php

declare(strict_types=1);

namespace Vendor\Administration\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Administration\Application\DTOs\AuditEntryData;

/** @property AuditEntryData $resource */
final class AuditEntryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'actor_id' => $this->resource->actorId,
            'actor_label' => $this->resource->actorLabel,
            'action' => $this->resource->action,
            'subject_type' => $this->resource->subjectType,
            'subject_id' => $this->resource->subjectId,
            'context' => (object) $this->resource->context,
            'created_at' => $this->resource->createdAt,
        ];
    }
}
