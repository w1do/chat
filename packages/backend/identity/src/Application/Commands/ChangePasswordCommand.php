<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Commands;

final readonly class ChangePasswordCommand
{
    public function __construct(
        public string $userId,
        public string $currentPassword,
        public string $newPassword,
        /** Токен запроса переживает смену пароля: остальные отзываются. */
        public ?int $currentAccessTokenId = null,
    ) {}
}
