<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:'.config('chat.message.max_length', 4000)],
            'reply_to_id' => ['sometimes', 'nullable', 'string', 'ulid'],
            'mentions' => ['sometimes', 'array', 'max:20'],
            'mentions.*' => ['string', 'ulid', 'exists:users,id'],
        ];
    }
}
