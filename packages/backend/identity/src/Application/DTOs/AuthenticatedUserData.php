<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\DTOs;

final readonly class AuthenticatedUserData
{
    public function __construct(
        public UserData $user,
        public ?BrowserTokenCookieData $browserTokenCookie = null,
    ) {}
}
