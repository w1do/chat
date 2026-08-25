<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Identity\Application\DTOs\ProfileImageData;

/** @property ProfileImageData $resource */
final class ProfileImageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'url' => $this->resource->url,
            'thumb_url' => $this->resource->thumbUrl,
            'current' => $this->resource->current,
        ];
    }
}
