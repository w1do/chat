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
            'username' => $command->username,
            // Отображаемое имя по умолчанию совпадает с логином; меняется в настройках.
            'name' => $command->name ?? $command->username,
            'password' => $command->password,
        ]);

        // Не через массовое присваивание: поле служебное и не приходит извне.
        $user->forceFill(['password_set_at' => now()])->save();

        // Значения по умолчанию (locale, timezone) задаёт БД — перечитываем,
        // чтобы ответ не содержал пустых строк.
        $user->refresh();

        /** @var StatefulGuard $guard */
        $guard = $this->auth->guard($this->config->get('identity.guard', 'web'));
        $guard->login($user);

        return UserData::fromModel($user);
    }
}
