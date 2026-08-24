<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Vendor\Ai\Domain\Enums\RevisionOperation;
use Vendor\Ai\Domain\Enums\Tone;

final class ReviseMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'operation' => ['required', Rule::enum(RevisionOperation::class)],
            'text' => ['required', 'string', 'max:'.config('ai.limits.max_input_length', 2000)],
            // Тон обязателен только для операции смены тона.
            'tone' => ['required_if:operation,tone', 'nullable', Rule::enum(Tone::class)],
            // Инструкция обязательна только для произвольной операции.
            'instruction' => ['required_if:operation,custom', 'nullable', 'string', 'max:200'],
        ];
    }
}
