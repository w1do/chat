<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Vendor\Identity\Application\Commands\ChangePasswordCommand;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class ChangePasswordHandler
{
    public function __construct(
        private UserModel $userModel,
        private Hasher $hasher,
    ) {}

    /** @throws ValidationException при неверном текущем пароле */
    public function handle(ChangePasswordCommand $command): void
    {
        $user = $this->userModel->findOrFail($command->userId);

        if (! $this->hasher->check($command->currentPassword, (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Текущий пароль указан неверно.'],
            ]);
        }

        // Новый remember_token разлогинивает украденные «запомнить меня» сессии.
        $user->forceFill([
            'password' => $command->newPassword,
            'remember_token' => Str::random(60),
        ])->save();
    }
}
