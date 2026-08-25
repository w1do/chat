<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Vendor\Identity\Application\Commands\ClearAvatarCommand;
use Vendor\Identity\Infrastructure\Auth\UserModel;

/** Вернуться к букве имени, сохранив набор загруженного. */
final readonly class ClearAvatarHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(ClearAvatarCommand $command): void
    {
        $user = $this->users->findOrFail($command->userId);
        $user->avatar_media_id = null;
        $user->save();
    }
}
