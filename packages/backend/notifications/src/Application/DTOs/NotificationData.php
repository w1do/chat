<?php

declare(strict_types=1);

namespace Vendor\Notifications\Application\DTOs;

final readonly class NotificationData
{
    /** @param array<string, mixed> $data */
    public function __construct(
        public string $id,
        public string $category,
        public array $data,
        public int $groupCount,
        public ?string $readAt,
        public string $createdAt,
    ) {}
}
