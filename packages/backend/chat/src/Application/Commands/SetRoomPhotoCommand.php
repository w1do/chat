<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class SetRoomPhotoCommand
{
    public function __construct(
        public string $roomId,
        public string $filePath,
        public string $fileName,
    ) {}
}
