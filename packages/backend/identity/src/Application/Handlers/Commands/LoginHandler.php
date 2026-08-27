<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Contracts\Config\Repository;
use Vendor\Identity\Application\Commands\LoginCommand;
use Vendor\Identity\Application\DTOs\AuthenticatedUserData;
use Vendor\Identity\Application\DTOs\UserData;
use Vendor\Identity\Application\Support\BrowserTokenLifecycle;
use Vendor\Identity\Domain\Models\User;

final readonly class LoginHandler
{
    public function __construct(
        private AuthFactory $auth,
        private Repository $config,
        private BrowserTokenLifecycle $browserTokens,
    ) {}

    /** @throws AuthenticationException при неверных учётных данных */
    public function handle(LoginCommand $command): AuthenticatedUserData
    {
        $guard = $this->guard();

        if (! $guard->attempt(
            ['username' => $command->username, 'password' => $command->password],
            $command->remember,
        )) {
            throw new AuthenticationException('Invalid credentials.');
        }

        /** @var User $user */
        $user = $guard->user();

        return new AuthenticatedUserData(
            user: UserData::fromModel($user),
            browserTokenCookie: $this->browserTokens->issue($user, $command->remember),
        );
    }

    private function guard(): StatefulGuard
    {
        /** @var StatefulGuard */
        return $this->auth->guard($this->config->get('identity.guard', 'web'));
    }
}
