<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class CreateRoomCommand
{
    public function __construct(
        public string $userId,
        public string $name,
        public ?string $topic,
        public string $visibility,
    ) {}
}
