<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UploadProfileImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            // image проверяет и расширение, и фактическое содержимое: одного
            // заявленного клиентом типа для решения недостаточно (§11).
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp,gif,bmp',
                'max:'.(int) config('identity.images.max_size_kb', 8192),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'image.image' => 'Это не изображение.',
            'image.mimes' => 'Такой формат изображения не принимается.',
            'image.max' => 'Изображение слишком большое.',
        ];
    }
}
