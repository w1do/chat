<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Contracts\Config\Repository;
use Vendor\Identity\Application\Commands\RegisterUserCommand;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class RegisterUserHandler
{
    public function __construct(
        private UserModel $userModel,
        private AuthFactory $auth,
        private Repository $config,
    ) {}

    public function handle(RegisterUserCommand $command): UserData
    {
        /** @var User $user */
        $user = $this->userModel->query()->create([
            'name' => $command->name,
            'email' => $command->email,
            'password' => $command->password,
        ]);

        /** @var StatefulGuard $guard */
        $guard = $this->auth->guard($this->config->get('identity.guard', 'web'));
        $guard->login($user);

        return UserData::fromModel($user);
    }
}
