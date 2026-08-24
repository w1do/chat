<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'locale' => ['sometimes', 'string', 'regex:/^[a-z]{2}(_[A-Z]{2})?$/'],
            'timezone' => ['sometimes', 'string', 'timezone'],
        ];
    }
}
