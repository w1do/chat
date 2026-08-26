<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StartDirectConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Начать диалог может любой аутентифицированный человек с любым
        // другим (design 6); существование собеседника проверяет обработчик.
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'user_id' => ['required', 'string', 'max:64'],
        ];
    }
}
