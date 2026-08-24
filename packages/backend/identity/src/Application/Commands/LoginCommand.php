<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class LoginCommand
{
    public function __construct(
        public string $email,
        public string $password,
        public bool $remember = false,
    ) {}
}
