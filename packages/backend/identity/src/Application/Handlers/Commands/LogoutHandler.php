<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Contracts\Config\Repository;
use Vendor\Identity\Application\Commands\LogoutCommand;

final readonly class LogoutHandler
{
    public function __construct(
        private AuthFactory $auth,
        private Repository $config,
    ) {}

    public function handle(LogoutCommand $command): void
    {
        /** @var StatefulGuard $guard */
        $guard = $this->auth->guard($this->config->get('identity.guard', 'web'));
        $guard->logout();
    }
}
