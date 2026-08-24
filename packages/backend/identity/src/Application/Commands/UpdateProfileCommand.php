<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class UpdateProfileCommand
{
    public function __construct(
        public string $userId,
        public ?string $name = null,
        public ?string $locale = null,
        public ?string $timezone = null,
    ) {}
}
