<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class ResetPasswordCommand
{
    public function __construct(
        public string $email,
        public string $token,
        public string $password,
    ) {}
}
