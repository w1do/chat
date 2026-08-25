<?php

declare(strict_types=1);

namespace Vendor\Chat\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SearchMemberCandidatesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        // Пустой и слишком короткий запрос не ошибка — он просто ничего не ищет.
        return [
            'query' => ['nullable', 'string', 'max:64'],
        ];
    }
}
