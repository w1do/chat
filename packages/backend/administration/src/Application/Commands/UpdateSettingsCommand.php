<?php

declare(strict_types=1);

namespace Vendor\Administration\Application\Commands;

final readonly class UpdateSettingsCommand
{
    public function __construct(
        public ?bool $aiEnabled = null,
        public ?string $actorId = null,
        public ?string $actorLabel = null,
    ) {}
}
