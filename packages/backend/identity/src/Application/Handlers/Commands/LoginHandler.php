<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\UserProvider;
use Vendor\Identity\Application\Commands\LoginCommand;
use Vendor\Identity\Application\DTOs\AuthenticatedUserData;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Domain\Models\User;

final readonly class LoginHandler
{
    public function __construct(private UserProvider $users) {}

    /** @throws AuthenticationException при неверных учётных данных */
    public function handle(LoginCommand $command): AuthenticatedUserData
    {
        // Провайдер, а не StatefulGuard: сессия здесь не заводится — вход
        // отдаёт токен, и только он авторизует дальнейшие запросы (ADR-012).
        $credentials = ['username' => $command->username, 'password' => $command->password];
        $user = $this->users->retrieveByCredentials($credentials);

        if (! $user instanceof User || ! $this->users->validateCredentials($user, $credentials)) {
            throw new AuthenticationException('Invalid credentials.');
        }

        return new AuthenticatedUserData(
            user: UserData::fromModel($user),
            // Без срока: токен действует, пока его не отозвали (ADR-012).
            token: $user->createToken('client', ['*'])->plainTextToken,
        );
    }
}
