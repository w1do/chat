<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class UploadAvatarCommand
{
    public function __construct(
        public string $userId,
        /** Путь к принятому файлу; обработчик забирает его себе. */
        public string $filePath,
        public string $fileName,
    ) {}
}
