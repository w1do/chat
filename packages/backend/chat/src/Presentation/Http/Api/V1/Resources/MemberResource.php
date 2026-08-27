<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\MemberData;

/** @property MemberData $resource */
final class MemberResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'room_id' => $this->resource->roomId,
            'user_id' => $this->resource->userId,
            'role' => $this->resource->role,
            'joined_at' => $this->resource->joinedAt,
            'name' => $this->resource->name,
            'username' => $this->resource->username,
            'avatar_url' => $this->resource->avatarUrl,
            'is_online' => $this->resource->isOnline,
            'last_seen_at' => $this->resource->lastSeenAt,
        ];
    }
}
