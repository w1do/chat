<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Vendor\Chat\Domain\Enums\RoomRole;

final class ChangeMemberRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in([RoomRole::Admin->value, RoomRole::Member->value])],
        ];
    }
}
