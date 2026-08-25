<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Vendor\Chat\Application\DTOs\MemberCandidateData;

/** @property MemberCandidateData $resource */
final class MemberCandidateResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'username' => $this->resource->username,
            'name' => $this->resource->name,
            'already_member' => $this->resource->alreadyMember,
        ];
    }
}
