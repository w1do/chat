<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class DeleteRoomCommand
{
    public function __construct(
        public string $roomId,
        public string $actorId,
    ) {}
}
