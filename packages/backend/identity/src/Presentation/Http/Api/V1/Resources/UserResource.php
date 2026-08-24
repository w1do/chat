<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Identity\Application\DTOs\UserData;

/** @property UserData $resource */
final class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'login' => $this->resource->username,
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'locale' => $this->resource->locale,
            'timezone' => $this->resource->timezone,
            'email_verified_at' => $this->resource->emailVerifiedAt,
            'created_at' => $this->resource->createdAt,
        ];
    }
}
