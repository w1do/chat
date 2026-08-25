<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class SetWallpaperCommand
{
    public function __construct(
        public string $userId,
        public string $filePath,
        public string $fileName,
    ) {}
}
