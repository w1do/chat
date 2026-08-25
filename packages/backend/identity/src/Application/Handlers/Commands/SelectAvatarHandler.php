<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Identity\Application\Commands\SelectAvatarCommand;
use Vendor\Identity\Application\DTOs\ProfileImageData;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

/**
 * Выбор прежней аватарки — перевод указателя, а не новая загрузка: файл в
 * хранилище остаётся тем же (design 2).
 */
final readonly class SelectAvatarHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(SelectAvatarCommand $command): ProfileImageData
    {
        $user = $this->users->findOrFail($command->userId);
        $media = $user->getMedia(User::AVATARS)->firstWhere('uuid', $command->avatarId);

        if ($media === null) {
            throw new NotFoundHttpException('Аватарка не найдена.');
        }

        $user->avatar_media_id = $media->getKey();
        $user->save();

        return ProfileImageData::avatar($media, current: true);
    }
}
