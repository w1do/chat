<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class RequestPasswordResetCommand
{
    public function __construct(public string $email) {}
}
