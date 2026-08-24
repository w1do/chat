<?php

declare(strict_types=1);

namespace Vendor\Identity\Presentation\Http\Api\V1\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'login.unique' => 'Такой логин уже занят.',
            'login.regex' => 'Логин может содержать латинские буквы, цифры, точку, дефис и подчёркивание.',
        ];
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            // Вход максимально короткий: логин и пароль (design 1b).
            'login' => ['required', 'string', 'min:3', 'max:64', 'regex:/^[a-zA-Z0-9._-]+$/', 'unique:users,username'],
            'password' => ['required', 'string', Password::min((int) config('identity.password.min_length', 10))],
            'name' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
