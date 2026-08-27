<?php

declare(strict_types=1);

namespace Vendor\Ai\Presentation\Http\Api\V1\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Форма запроса пересказа. Право на сообщение и пригодность файла знает
 * переписка, поэтому здесь — только формат: адресат, черновик с триггером,
 * ключ идемпотентности и язык.
 */
final class RequestFileSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        /** @var list<string> $locales */
        $locales = (array) config('ai.file_summary.locales', ['en']);

        return [
            'message_id' => ['required', 'string', 'ulid'],
            'body' => ['required', 'string', 'max:4000', $this->mentionsTrigger()],
            'idempotency_key' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'locale' => ['nullable', 'string', Rule::in($locales)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'message_id.required' => 'Не указано сообщение, документ которого нужно пересказать.',
        ];
    }

    /** Помощник зовётся токеном в черновике ответа (spec: trigger via @ai). */
    private function mentionsTrigger(): Closure
    {
        $trigger = (string) config('ai.file_summary.trigger', '@ai');

        return static function (string $attribute, mixed $value, Closure $fail) use ($trigger): void {
            $pattern = '/(?<![\p{L}\p{N}])'.preg_quote($trigger, '/').'(?![\p{L}\p{N}])/iu';

            if (! is_string($value) || preg_match($pattern, $value) !== 1) {
                $fail("Чтобы позвать помощника, упомяните {$trigger} в ответе.");
            }
        };
    }
}
