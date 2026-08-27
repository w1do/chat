<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class LogoutCommand
{
    public function __construct(public ?int $currentAccessTokenId = null) {}
}
