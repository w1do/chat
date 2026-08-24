<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Notifications\Application\DTOs\NotificationData;

/** @property NotificationData $resource */
final class NotificationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'category' => $this->resource->category,
            'room_id' => $this->resource->data['room_id'] ?? null,
            'room_name' => $this->resource->data['room_name'] ?? null,
            'actor_name' => $this->resource->data['actor_name'] ?? null,
            'preview' => $this->resource->data['preview'] ?? '',
            'group_count' => $this->resource->groupCount,
            'read_at' => $this->resource->readAt,
            'created_at' => $this->resource->createdAt,
        ];
    }
}
