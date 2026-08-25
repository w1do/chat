<?php

declare(strict_types=1);

namespace Vendor\Identity\Application\Handlers\Commands;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Vendor\Identity\Application\Commands\DeleteAvatarCommand;
use Vendor\Identity\Domain\Models\User;
use Vendor\Identity\Infrastructure\Auth\UserModel;

/**
 * Удаление из набора. Если удалили ту, что показывалась, текущей становится
 * другая из набора; опустевший набор возвращает букву имени (spec).
 */
final readonly class DeleteAvatarHandler
{
    public function __construct(private UserModel $users) {}

    public function handle(DeleteAvatarCommand $command): void
    {
        $user = $this->users->findOrFail($command->userId);
        $media = $user->getMedia(User::AVATARS)->firstWhere('uuid', $command->avatarId);

        if ($media === null) {
            throw new NotFoundHttpException('Аватарка не найдена.');
        }

        $wasCurrent = $user->avatar_media_id === $media->getKey();
        $media->delete();

        if (! $wasCurrent) {
            return;
        }

        $user->unsetRelation('media');
        $next = $user->getMedia(User::AVATARS)->last();
        $user->avatar_media_id = $next instanceof Media ? $next->getKey() : null;
        $user->save();
    }
}
