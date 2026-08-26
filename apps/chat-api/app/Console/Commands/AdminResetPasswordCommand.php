<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Служебный namespace admin:* — консольные операции оператора установки без
 * админ-панели. Первая команда сбрасывает пользователю пароль на сервере.
 */
final class AdminResetPasswordCommand extends Command
{
    protected $signature = 'admin:reset-password {username : Логин пользователя} {password : Новый пароль}';

    protected $description = 'Reset a user password from the server console';

    public function handle(): int
    {
        $user = User::query()->where('username', $this->argument('username'))->first();

        if ($user === null) {
            $this->error('Пользователь с таким логином не найден.');

            return self::FAILURE;
        }

        $password = (string) $this->argument('password');

        $validator = Validator::make(
            ['password' => $password],
            ['password' => ['required', 'string', Password::min((int) config('identity.password.min_length', 10))]],
        );

        if ($validator->fails()) {
            $this->error((string) $validator->errors()->first('password'));

            return self::FAILURE;
        }

        // Единый паттерн установки пароля (ChangePasswordHandler/ResetPasswordHandler):
        // хэширует каст 'hashed', помечает пароль как заданный человеком, а новый
        // remember_token разлогинивает украденные «запомнить меня» сессии.
        $user->forceFill([
            'password' => $password,
            'password_set_at' => now(),
            'remember_token' => Str::random(60),
        ])->save();

        $this->info("Пароль пользователя {$user->username} обновлён.");

        return self::SUCCESS;
    }
}
