<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class ArchiveRoomCommand
{
    public function __construct(
        public string $roomId,
    ) {}
}
