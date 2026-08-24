<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class InviteMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'user_id' => ['required', 'string', 'ulid', 'exists:users,id'],
        ];
    }
}
