<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Vendor\Chat\Presentation\Http\Api\V1\Rules\AttachmentFile;

final class UploadAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:'.(int) config('chat.attachments.max_size_kb', 25600),
                new AttachmentFile,
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        $limitMb = (int) round(((int) config('chat.attachments.max_size_kb', 25600)) / 1024);

        return [
            'file.required' => 'Файл не передан.',
            'file.max' => "Файл больше {$limitMb} МБ.",
        ];
    }
}
