<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\UpdateProfileCommand;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class UpdateProfileHandler
{
    public function __construct(private UserModel $userModel) {}

    public function handle(UpdateProfileCommand $command): UserData
    {
        $user = $this->userModel->findOrFail($command->userId);

        $user->fill(array_filter([
            'name' => $command->name,
            'locale' => $command->locale,
            'timezone' => $command->timezone,
        ], fn (?string $value): bool => $value !== null));

        $user->save();

        return UserData::fromModel($user);
    }
}
