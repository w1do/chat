<?php

namespace App\Domain\User\Commands;

use App\Domain\User\DTO\UpdateProfileDTO;
use App\Domain\User\Models\User;

/**
 * Command - это простое DTO для передачи намерения изменить состояние.
 */
readonly class UpdateUserCommand
{
    public function __construct(
        public int $userId,
        public UpdateProfileDTO $dto,
    ) {}
}

/**
 * Handler - содержит бизнес-логику обработки команды.
 */
class UpdateUserHandler
{
    public function handle(UpdateUserCommand $command): User
    {
        $user = User::findOrFail($command->userId);
        
        $user->update([
            'name' => $command->dto->name,
            'email' => $command->dto->email,
            'settings' => $command->dto->settings,
        ]);

        return $user;
    }
}
