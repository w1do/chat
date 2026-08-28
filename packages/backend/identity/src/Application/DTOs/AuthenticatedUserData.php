<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

final readonly class AuthenticatedUserData
{
    public function __construct(
        public UserData $user,
        /** Plaintext-значение выдаётся один раз — в ответе входа (ADR-012). */
        public string $token,
    ) {}
}
