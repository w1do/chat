<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\RoomImageData;

/** @property RoomImageData $resource */
final class RoomImageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'url' => $this->resource->url,
            'thumb_url' => $this->resource->thumbUrl,
        ];
    }
}
