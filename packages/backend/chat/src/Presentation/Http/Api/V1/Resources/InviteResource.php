<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\InviteData;

/** @property InviteData $resource */
final class InviteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'room_id' => $this->resource->roomId,
            'room_name' => $this->resource->roomName,
            'invited_by_name' => $this->resource->invitedByName,
            'expires_at' => $this->resource->expiresAt,
            // Токен отдаётся только сразу после создания ссылки.
            'token' => $this->resource->token,
        ];
    }
}
