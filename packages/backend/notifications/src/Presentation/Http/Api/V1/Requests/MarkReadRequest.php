<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MarkReadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            // Пустой список означает «отметить всё прочитанным».
            'ids' => ['sometimes', 'array', 'max:200'],
            'ids.*' => ['string', 'uuid'],
        ];
    }
}
