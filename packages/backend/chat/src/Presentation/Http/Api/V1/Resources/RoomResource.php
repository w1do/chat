<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\RoomData;

/** @property RoomData $resource */
final class RoomResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'topic' => $this->resource->topic,
            'visibility' => $this->resource->visibility,
            'kind' => $this->resource->kind,
            'created_by' => $this->resource->createdBy,
            'archived_at' => $this->resource->archivedAt,
            'created_at' => $this->resource->createdAt,
            'my_role' => $this->resource->myRole,
            'member_count' => $this->resource->memberCount,
            'unread_count' => $this->resource->unreadCount,
            'photo_url' => $this->resource->photoUrl,
            'photo_large_url' => $this->resource->photoLargeUrl,
            // Собеседник диалога; у комнаты отсутствует, а не пуст.
            'counterpart' => $this->resource->counterpart === null ? null : [
                'id' => $this->resource->counterpart->id,
                'username' => $this->resource->counterpart->username,
                'name' => $this->resource->counterpart->name,
                'avatar_url' => $this->resource->counterpart->avatarUrl,
            ],
        ];
    }
}
