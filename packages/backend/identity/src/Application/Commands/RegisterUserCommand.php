<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class RegisterUserCommand
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
    ) {}
}
