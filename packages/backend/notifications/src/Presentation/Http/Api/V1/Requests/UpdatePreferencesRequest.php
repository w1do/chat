<?php

declare(strict_types=1);

namespace Vendor\Notifications\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Vendor\Notifications\Domain\Enums\Category;
use Vendor\Notifications\Domain\Enums\Channel;

final class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array', 'min:1', 'max:20'],
            'preferences.*.category' => ['required', Rule::enum(Category::class)],
            'preferences.*.channel' => ['required', Rule::enum(Channel::class)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ];
    }
}
