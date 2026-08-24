<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\UpdateEmailCommand;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class UpdateEmailHandler
{
    public function __construct(private UserModel $userModel) {}

    public function handle(UpdateEmailCommand $command): UserData
    {
        $user = $this->userModel->findOrFail($command->userId);

        // Смена адреса сбрасывает подтверждение; пустое значение убирает почту.
        $user->forceFill([
            'email' => $command->email,
            'email_verified_at' => null,
        ])->save();

        return UserData::fromModel($user);
    }
}
