<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Contracts\Auth\PasswordBrokerFactory;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Vendor\Identity\Application\Commands\ResetPasswordCommand;
use Vendor\Identity\Domain\Models\User;

final readonly class ResetPasswordHandler
{
    public function __construct(private PasswordBrokerFactory $passwords) {}

    /** @throws ValidationException при неверном или истёкшем токене */
    public function handle(ResetPasswordCommand $command): void
    {
        $status = $this->passwords->broker()->reset(
            [
                'email' => $command->email,
                'token' => $command->token,
                'password' => $command->password,
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'password_set_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                // Пароль сбрасывают, когда доступ мог быть потерян: ни один
                // прежде выданный токен больше не действует (ADR-012).
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }
    }
}
