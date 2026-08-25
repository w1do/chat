<?php

declare(strict_types=1);

namespace Vendor\Chat\Application\Commands;

final readonly class UploadAttachmentCommand
{
    public function __construct(
        public string $roomId,
        public string $uploaderId,
        public string $filePath,
        public string $fileName,
    ) {}
}
