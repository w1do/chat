<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Vendor\Chat\Domain\Enums\RoomVisibility;

final class CreateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'topic' => ['sometimes', 'nullable', 'string', 'max:500'],
            'visibility' => ['required', Rule::enum(RoomVisibility::class)],
        ];
    }
}
