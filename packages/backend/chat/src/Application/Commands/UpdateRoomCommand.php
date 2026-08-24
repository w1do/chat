<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class UpdateRoomCommand
{
    public function __construct(
        public string $roomId,
        public ?string $name = null,
        public ?string $topic = null,
    ) {}
}
