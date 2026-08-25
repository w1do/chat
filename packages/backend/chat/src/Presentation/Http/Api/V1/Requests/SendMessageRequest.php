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
            // Текст обязателен, только пока нет вложений: сообщение полно,
            // когда есть хотя бы одно из двух (spec chat/rooms-and-messages).
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:'.config('chat.message.max_length', 4000)],
            'reply_to_id' => ['sometimes', 'nullable', 'string', 'ulid'],
            'mentions' => ['sometimes', 'array', 'max:20'],
            'mentions.*' => ['string', 'ulid', 'exists:users,id'],
            'attachments' => ['sometimes', 'array', 'min:1', 'max:'.(int) config('chat.attachments.max_files', 10)],
            'attachments.*' => ['string', 'uuid', 'distinct'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'body.required_without' => 'Сообщение должно содержать текст или вложение.',
            'attachments.max' => 'К одному сообщению можно приложить не больше '
                .(int) config('chat.attachments.max_files', 10).' файлов.',
        ];
    }
}
