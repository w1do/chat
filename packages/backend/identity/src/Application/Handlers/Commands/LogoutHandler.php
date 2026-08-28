<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Laravel\Sanctum\PersonalAccessToken;
use Vendor\Identity\Application\Commands\LogoutCommand;

final readonly class LogoutHandler
{
    /**
     * Выход отзывает токен только этого устройства: на остальных человек
     * остаётся вошедшим (spec identity/token-authentication).
     */
    public function handle(LogoutCommand $command): void
    {
        if ($command->currentAccessTokenId === null) {
            return;
        }

        PersonalAccessToken::query()->whereKey($command->currentAccessTokenId)->delete();
    }
}
