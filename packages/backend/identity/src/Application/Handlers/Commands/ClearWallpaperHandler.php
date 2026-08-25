<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\ClearWallpaperCommand;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

final readonly class ClearWallpaperHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(ClearWallpaperCommand $command): void
    {
        $this->users->findOrFail($command->userId)->clearMediaCollection(User::WALLPAPER);
    }
}
