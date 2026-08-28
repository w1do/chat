<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string'],
        ];
    }
}
