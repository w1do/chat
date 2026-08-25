<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UnsubscribeDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'endpoint' => ['required', 'string', 'url', 'max:2048'],
        ];
    }
}
