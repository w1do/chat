<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\AttachmentData;

/** @property AttachmentData $resource */
final class AttachmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return $this->resource->toArray();
    }
}
