<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\RegisterUserCommand;
use Vendor\Identity\Application\DTOs\AuthenticatedUserData;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class RegisterUserHandler
{
    public function __construct(
        private UserModel $userModel,
    ) {}

    public function handle(RegisterUserCommand $command): AuthenticatedUserData
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

        return new AuthenticatedUserData(
            user: UserData::fromModel($user),
            // Регистрация — тот же вход: сессии нет, авторизует токен (ADR-012).
            token: $user->createToken('client', ['*'])->plainTextToken,
        );
    }
}
